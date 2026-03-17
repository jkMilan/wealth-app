import { inngest } from "./client";
import { db } from "../prisma";
import { sendEmail } from "@/actions/send-email";
import EmailTemplate from "@/emails/template";


export const checkBudgetAlerts = inngest.createFunction(
  { 
    id:"check-budget-alerts",
    name: "Check Budget Alerts" 
  },
  { cron: "0 */6 * * *" }, // Runs every 6 hours
  async ({ step }) => {

    // 1️⃣ Fetch all budgets with user + default account
    const budgets = await step.run("fetch-budgets", async () => {
      return db.budget.findMany({
        include: {
          user: {
            include: {
              accounts: {
                where: { isDefault: true }
              }
            }
          }
        }
      });
    });

    const currentDate = new Date();

    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );

    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
      23,59,59
    );

    for (const budget of budgets) {

      const defaultAccount = budget.user.accounts[0];
      if (!defaultAccount) continue;

      await step.run(`check-budget-${budget.id}`, async () => {

        // 2️⃣ Calculate expenses
        const expenses = await db.transaction.aggregate({
          where: {
            userId: budget.userId,
            accountId: defaultAccount.id,
            type: "EXPENSE",
            date: {
              gte: startOfMonth,
              lte: endOfMonth
            }
          },
          _sum: {
            amount: true
          }
        });

        const totalExpenses = Number(expenses._sum.amount || 0);
        const budgetAmount = Number(budget.amount);

        if (budgetAmount === 0) return;

        const percentageUsed = (totalExpenses / budgetAmount) * 100;

        // 3️⃣ Check if alert needed
        const shouldSendAlert =
          percentageUsed >= 80 &&
          (!budget.lastAlertSent ||
            isNewMonth(budget.lastAlertSent, currentDate));

        if (!shouldSendAlert) return;

        // 4️⃣ Send email
        await sendEmail({
          to: budget.user.email,
          subject: `Budget Alert for ${defaultAccount.name}`,
          react: EmailTemplate({
            userName: budget.user.name,
            type: "budget-alert",
            data: {
              percentageUsed: percentageUsed.toFixed(1),
              budgetAmount: budgetAmount.toFixed(2),
              totalExpenses: totalExpenses.toFixed(2),
              accountName: defaultAccount.name,
            },
          }),
        });

        // 5️⃣ Update alert timestamp
        await db.budget.update({
          where: { id: budget.id },
          data: {
            lastAlertSent: new Date(),
          },
        });
      });
    }
  }
);

function isNewMonth(lastAlertDate, currentDate) {
  return (
    lastAlertDate.getMonth() !== currentDate.getMonth() ||
    lastAlertDate.getFullYear() !== currentDate.getFullYear()
  );
}

export const triggerRecurringTransactions = inngest.createFunction({
    id:"trigger-recurring-transactions",
    name:"Trigger Recurring Transactions",
},{cron:"0 0 * * *"},async({step})=>{
    // 1. Fetch all due recurring transactions
    const recurringTransactions = await step.run(
        "fetch-recurring-transactions",
        async()=>{
            return db.transaction.findMany({
                where:{
                isRecurring:true,
                status:"COMPLETED",
                OR:[
                    { lastProcessed:null },
                    { nextRecurringDate: { lte:new Date()} },
                ],
            },
        });
        }
    );

    // 2. Create event for each transaction
    if (recurringTransactions.length > 0) {
        const events = recurringTransactions.map((transaction)=>({
            name: "transaction.recurring.process",
            data: { transactionId: transaction.id, userId: transaction.userId },
        }));

        await inngest.send(events);
    }

    return { triggered: recurringTransactions.length };
});

export const processRecurringTransaction = inngest.createFunction(
    {
        id: "process-recurring-transaction",
        name: "Process Recurring Transaction",
        throttle: {
            limit: 10,
            period: "1m",
            key: "event.data.userId",
        },
    },
    {event: "transaction.recurring.process"},
    async({step,event})=>{
        if(!event?.data?.transactionId || !event?.data?.userId) {
            console.error("Invalid event data", event);
            return { error: "Missing required event data"}
        }
        await step.run("process-transaction",async()=>{
            const transaction = await db.transaction.findUnique({
                where:{id:event.data.transactionId, userId:event.data.userId},
                include:{account:true}
            });
            if(!transaction || !isTransactionDue(transaction)) return;

            await db.$transaction(async(tx)=>{
                // 1. Create new transaction
                await tx.transaction.create({
                    data:{
                        type:transaction.type,
                        amount:transaction.amount,
                        description: `${transaction.description} (Recurring)`,
                        date:new Date(),
                        category:transaction.category,
                        accountId:transaction.accountId,
                        userId:transaction.userId,
                        isRecurring:false,
                    },
                });

                // Update account balance
                const balanceChange =
                    transaction.type === "EXPENSE"
                        ? -transaction.amount.toNumber()
                        : transaction.amount.toNumber();

                await tx.account.update({
                    where:{id:transaction.accountId},
                    data:{balance:{increment:balanceChange}},
                });

                // Update last processed data and next recurring data
                await tx.transaction.update({
                  where: { id: transaction.id },
                  data: {
                    lastProcessed: new Date(),
                    nextRecurringDate: calculateNextRecurringDate(
                      new Date(),
                      transaction.recurringInterval
                    ),
                  },
                });
            }); 
        });
    }
);

function isTransactionDue(transaction){
    if (!transaction.lastProcessed) return true;
    
    const today = new Date();
    const nextDue = new Date(transaction.nextRecurringDate);
    
    return nextDue <= today;
}

function calculateNextRecurringDate(startDate, interval) {
    const date = new Date(startDate);

    switch (interval) {
        case "DAILY":
            date.setDate(date.getDate() + 1);
            break;
        case "WEEKLY":
            date.setDate(date.getDate() + 7);
            break;
        case "MONTHLY":
            date.setMonth(date.getMonth() + 1);
            break;
        case "YEARLY":
            date.setFullYear(date.getFullYear() + 1);
            break;
    }
    return date;
}

export const generateMonthlyReport = inngest.createFunction(
    {
        id: "generate-monthly-report",
        name: "Generate Monthly Report",
    },
    {cron: "0 0 1 * *"},
    async({step})=>{
       const users = await step.run("fetch-users",async()=>{
        return await db.user.findMany({
          include:{accounts:true}
        });
       });

      for(const user of users){
       await step.run(`generate-report-${user.id}`,async()=>{
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const stats = await getMonthlyStats(user.id,lastMonth);
        const monthName = lastMonth.toLocaleString("default",{month:"long"
        });

        const insights = await generateFinancialInsights(stats, monthName);

        await sendEmail({
          to: user.email,
          subject: `Your Monthly Financial Report for ${monthName}`,
          react: EmailTemplate({
            userName: user.name,
            type: "monthly-report",
            data: {
              stats,
              month:monthName,
              insights,
            },
          }),
        });
      }); 
      }

      return { processed: users.length };
    }
  );

  async function generateFinancialInsights(stats, month) {
  try {
    const { totalIncome, totalExpenses, byCategory } = stats;
    const netIncome = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((netIncome / totalIncome) * 100).toFixed(1) : 0;
    
    const insights = [];

    // 1. Overall Financial Health Insight
    if (netIncome > 0) {
      if (savingsRate >= 20) {
        insights.push(`Fantastic job this ${month}! You saved $${netIncome}, which is a stellar ${savingsRate}% savings rate. Consider investing this surplus!`);
      } else {
        insights.push(`Good work staying in the green this ${month}. You saved $${netIncome} (${savingsRate}% of your income). See if you can push that to 20% next month.`);
      }
    } else if (netIncome === 0) {
      insights.push(`You broke exactly even in ${month}. It's a great time to review your budget and find small areas to cut back so you can start growing your savings.`);
    } else {
      insights.push(`Heads up: Your expenses exceeded your income by $${Math.abs(netIncome)} this ${month}. Consider pausing non-essential spending to get back on track.`);
    }

    // 2. Highest Expense Category Insight
    const categories = Object.entries(byCategory || {});
    if (categories.length > 0) {
      // Sort categories from highest to lowest amount
      const sortedCategories = categories.sort((a, b) => b[1] - a[1]);
      const [topCategory, topAmount] = sortedCategories[0];
      
      const expensePercentage = totalExpenses > 0 ? ((topAmount / totalExpenses) * 100).toFixed(1) : 0;
      
      insights.push(`Your biggest expense was **${topCategory}** at $${topAmount}, making up ${expensePercentage}% of your total spending. Is there any room to reduce this next month?`);
      
      // 3. Secondary Actionable Insight based on other categories
      if (sortedCategories.length > 1) {
          const [secondCategory, secondAmount] = sortedCategories[1];
          insights.push(`You also spent $${secondAmount} on **${secondCategory}**. Setting strict limits on your top two categories is the fastest way to free up extra cash.`);
      } else {
          insights.push(`Since most of your spending is going to one place, try breaking your budget down into smaller sub-categories to find hidden savings.`);
      }
    } else {
      insights.push("Start categorizing your transactions! It is the best way to understand where your money is actually going.");
      insights.push("Tracking daily expenses can help you identify money leaks and save up to 15% more each month.");
    }

    // Ensure we always return exactly 3 insights
    while (insights.length < 3) {
      insights.push("Setting up automatic savings transfers on payday is a proven way to build wealth without thinking about it.");
    }

    // Return the first 3 insights just to be safe
    return insights.slice(0, 3);
    
  } catch (error) {
    console.error("Error generating insights:", error);
    return [
      "Your highest expense category this month might need attention.",
      "Consider setting up a budget for better financial management.",
      "Track your recurring expenses to identify potential savings.",
    ];
  }
}
    

  const getMonthlyStats= async (userId, month)=>{
    const startDate = new Date(month.getFullYear(),month.getMonth(),1);
    const endDate = new Date(month.getFullYear(),month.getMonth()+1,0);

    const transactions = await db.transaction.findMany({
      where:{
        userId,
        date:{
          gte:startDate,
          lte:endDate,
        },
      },
    });

    return transactions.reduce((stats,t)=>{
      const amount = t.amount.toNumber();
      if(t.type === "EXPENSE"){
        stats.totalExpenses += amount;
        stats.byCategory[t.category] = (stats.byCategory[t.category] || 0) + amount;
      }else{
        stats.totalIncome += amount;
      }
      return stats;
    },{
      totalIncome:0,
      totalExpenses:0,
      byCategory:{},
      transactionCount: transactions.length,
    });
  };
    

// SMS

export const processIncomingSms = inngest.createFunction(
  { id: "process-incoming-sms", name: "Process Incoming SMS" },
  { event: "app/sms.received" },
  async ({ event, step }) => {
    const { message, sender, userId } = event.data;

    // 1. Safety check to prevent crashes if the Shortcut sends empty data
    if (!message || typeof message !== 'string') {
      return { skip: "No message text provided in the event data." };
    }

    // 2. Send SMS to your local Python NLP service (replaces the regex .match code)
    const nlpResult = await step.run("nlp-extraction", async () => {
      const response = await fetch("http://127.0.0.1:8000/api/ml/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: message, 
          sender: sender || "Unknown" 
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process SMS through local AI");
      }
      return await response.json();
    });

    // 3. Stop if NLP says there is no valid amount
    if (!nlpResult.success || nlpResult.amount <= 0) {
      return { skip: "No transaction amount found in text." };
    }

    // 4. Save to Database
    const savedTransaction = await step.run("save-transaction", async () => {
      const account = await db.account.findFirst({
        where: { userId: userId, isDefault: true },
      });

      if (!account) {
        throw new Error("No default account found for this user.");
      }

      // Calculate balance change (Expense removes money, Income adds money)
      const balanceChange = nlpResult.type === "EXPENSE" ? -nlpResult.amount : nlpResult.amount;

      // Use a Prisma transaction to update both tables safely
      return await db.$transaction(async (tx) => {
        const newTx = await tx.transaction.create({
          data: {
            amount: nlpResult.amount,
            type: nlpResult.type,
            description: `SMS: ${nlpResult.merchant}`,
            category: nlpResult.category,
            date: new Date(),
            accountId: account.id,
            userId: userId,
            status: "COMPLETED",
          },
        });

        await tx.account.update({
          where: { id: account.id },
          data: { balance: { increment: balanceChange } },
        });

        return newTx;
      });
    });

    return { success: true, transaction: savedTransaction };
  }
);

export const saveAnalyzedSms = inngest.createFunction(
  { id: "save-analyzed-sms", name: "Save Analyzed SMS to DB" },
  { event: "app/sms.analyzed" },
  async ({ event, step }) => {
    const { amount, type, merchant, category, userId } = event.data;

    await step.run("save-transaction", async () => {
      // Find default account
      const account = await db.account.findFirst({
        where: { userId: userId, isDefault: true }
      });

      if (!account) throw new Error("No default account found");

      const balanceChange = type === 'EXPENSE' ? -amount : amount;

      // Update Database
      return await db.$transaction(async (tx) => {
        const newTx = await tx.transaction.create({
          data: {
            amount, type, category,
            description: `SMS: ${merchant}`,
            date: new Date(),
            accountId: account.id,
            userId: userId,
            status: "COMPLETED"
          }
        });

        await tx.account.update({
          where: { id: account.id },
          data: { balance: { increment: balanceChange } }
        });

        return newTx;
      });
    });

    return { success: true };
  }
);