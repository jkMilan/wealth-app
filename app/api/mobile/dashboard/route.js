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

    // 2. Step 2 Fix: Fetch Budget from the shared 'Budget' model
    // This ensures web and mobile view the same budget limit
    const budget = await db.budget.findFirst({
      where: {
        userId: userId,
        accountId: defaultAccount?.id,
      },
    });
    const budgetLimit = budget ? Number(budget.amount) : 0;

    // 3. Step 4 Fix: Global Calculations
    // Fetch all user transactions to calculate accurate Income/Expenses/Pie Chart
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const allTransactions = await db.transaction.findMany({
      where: { userId: userId },
      include: { account: { select: { name: true } } }
    });

    let income = 0;
    let expense = 0;
    const categoryTotals = {};

    allTransactions.forEach(t => {
      const amount = Number(t.amount);
      const txDate = new Date(t.date);

      // Only aggregate totals for the current month
      if (txDate >= startOfMonth && txDate <= endOfMonth) {
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

    const colors = ['#facc15', '#ec4899', '#7f1d1d', '#000000', '#14b8a6', '#3b82f6', '#ef4444', '#f97316'];
    const pieData = Object.keys(categoryTotals).map((key, index) => ({
      text: key,
      value: categoryTotals[key],
      color: colors[index % colors.length],
    }));

    // Calculate progress based on total monthly spending vs budget limit
    const budgetPercentage = budgetLimit > 0 ? Math.min((expense / budgetLimit) * 100, 100) : 0;

    // Filter recent transactions specifically for the default account
    const recentTransactions = allTransactions
      .filter(t => t.accountId === defaultAccount?.id)
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