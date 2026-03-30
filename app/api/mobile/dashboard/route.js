import { NextResponse } from "next/server";
import { db } from "@/lib/prisma"; 
import { decrypt } from "@/lib/auth"; 

export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    const payload = await decrypt(token); 
    
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const userId = payload.userId;

    // 1. Define date boundaries first to fix the ReferenceError
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);

    // 2. Fetch all user accounts
    const accounts = await db.account.findMany({
      where: { userId: userId },
      orderBy: { isDefault: "desc" }, 
    });
    
    const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance), 0);
    const defaultAccount = accounts.find(a => a.isDefault === true) || accounts[0];

    // 3. Fetch the budget for the default account
    const budgetRecord = await db.budget.findFirst({
      where: {
        userId: userId,
        accountId: defaultAccount?.id,
      },
    });
    const budgetLimit = budgetRecord ? Number(budgetRecord.amount) : 0;

    // 4. Fetch transactions for the current month AND the last 10 transactions
    // Fetching all relevant transactions for the user to ensure "Recent Transactions" 
    // are not restricted only to the current month if it's the start of the month.
    const transactions = await db.transaction.findMany({
      where: { userId: userId },
      orderBy: { date: "desc" },
      include: { account: { select: { name: true } } }
    });

    let income = 0;
    let expense = 0;
    const categoryTotals = {};

    // 5. Calculate monthly totals for the default account
    transactions.forEach(t => {
      const amount = Number(t.amount);
      const tDate = new Date(t.date);

      // Only include transactions for the default account within the current month for budget tracking
      if (t.accountId === defaultAccount?.id && tDate >= startOfMonth && tDate <= endOfMonth) {
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

    // 6. Format pie chart data
    const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#FF0080', '#FF0000', '#000000', '#8B0000', '#008000'];
    const pieData = Object.keys(categoryTotals).map((key, index) => ({
      text: key,
      value: categoryTotals[key],
      color: colors[index % colors.length],
    }));

    const budgetPercentage = budgetLimit > 0 ? Math.min((expense / budgetLimit) * 100, 100) : 0;

    // 7. Get truly recent transactions (last 10) regardless of the month
    const recentTransactions = transactions
      .filter(t => t.accountId === defaultAccount?.id)
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