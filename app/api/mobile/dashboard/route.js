import { NextResponse } from "next/server";
import { db } from "@/lib/prisma"; // Use the shared Prisma instance
import { decrypt } from "@/lib/auth"; // For session verification

export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    const payload = await decrypt(token); // Decrypt token to get user context
    
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const userId = payload.userId;

    // 1. Fetch all accounts for the user
    const accounts = await db.account.findMany({
      where: { userId: userId },
      orderBy: { isDefault: "desc" }, 
    });
    
    const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance), 0);
    const defaultAccount = accounts.find(a => a.isDefault === true) || accounts[0];

    // 2. Fetch Budget from the shared 'Budget' model
    // This ensures web and mobile view the same budget limit
    const budget = await db.budget.findFirst({
      where: {
        userId: userId,
        accountId: defaultAccount?.id,
      },
    });
    const budgetLimit = budget ? Number(budget.amount) : 0;

    // 3. Global Calculations
    // Fetch all user transactions to calculate accurate Income/Expenses/Pie Chart
    const allTransactions = await db.transaction.findMany({
      where: { userId: userId },
      include: { account: { select: { name: true } } }
    });

    // We filter for default account below to match web logic where dashboard targets mostly default account.
    const defaultAccountTransactions = allTransactions.filter(t => t.accountId === defaultAccount?.id);

    let income = 0;
    let expense = 0;
    const categoryTotals = {};
    const currentDate = new Date();

    defaultAccountTransactions.forEach(t => {
      const amount = Number(t.amount);
      const transactionDate = new Date(t.date);

      // Only aggregate totals for the current month
      if (
        transactionDate.getMonth() === currentDate.getMonth() &&
        transactionDate.getFullYear() === currentDate.getFullYear()
      ) {
        if (t.type === "INCOME") {
          income += Math.abs(amount);
        } else if (t.type === "EXPENSE") {
          expense += Math.abs(amount);
          
          let rawCat = t.category || 'Uncategorized';
          let formattedCat = rawCat.toLowerCase().replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
          categoryTotals[formattedCat] = (categoryTotals[formattedCat] || 0) + Math.abs(amount);
        }
      }
    });

    const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#FF0080', '#FF0000', '#000000', '#8B0000', '#008000'];
    const pieData = Object.keys(categoryTotals).map((key, index) => ({
      text: key,
      value: categoryTotals[key],
      color: colors[index % colors.length],
    }));

    // Calculate progress based on total monthly spending vs budget limit
    const budgetPercentage = budgetLimit > 0 ? Math.min((expense / budgetLimit) * 100, 100) : 0;

    // Filter recent transactions specifically for the default account
    const recentTransactions = defaultAccountTransactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    return NextResponse.json({
      totalBalance,
      accounts: accounts.map(acc => ({...acc, balance: Number(acc.balance)})),     
      income,           
      expense,          
      transactions: recentTransactions.map(t => ({...t, amount: Number(t.amount)})),     
      budgetLimit,      
      budgetPercentage, 
      pieData           
    }, { status: 200 });

  } catch (error) {
    console.error("MOBILE DASHBOARD ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}