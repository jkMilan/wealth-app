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

    // 1. Fetch Accounts
    const accounts = await db.account.findMany({
      where: { userId: userId },
      orderBy: { isDefault: "desc" }, 
    });
    const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance), 0);
    const defaultAccount = accounts.find(a => a.isDefault === true) || accounts[0];

    // 2. Fetch Budget
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { monthlyBudget: true }
    });
    const budgetLimit = defaultAccount?.monthlyBudget || user?.monthlyBudget || 0; 

    // 3. Fetch Transactions for Default Account
    const transactions = await db.transaction.findMany({
      where: { 
        userId: userId,
        accountId: defaultAccount?.id
      },
      orderBy: { date: "desc" }, 
      include: { account: { select: { name: true } } }
    });

    // 4. Current Month Boundaries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 5. Process Income, Expense, and Chart Data
    let income = 0;
    let expense = 0;
    const categoryTotals = {};

    transactions.forEach(t => {
      const amount = Number(t.amount);
      const txDate = new Date(t.date);

      // Only calculate totals for the CURRENT MONTH
      if (txDate >= startOfMonth && txDate <= endOfMonth) {
        if (t.type === "INCOME") {
          income += Math.abs(amount);
        } else if (t.type === "EXPENSE") {
          expense += Math.abs(amount);

          // Build Pie Chart Categories
          let rawCat = t.category || 'Uncategorized';
          let cleanCat = rawCat.toLowerCase().replace(/-/g, ' ');
          let formattedCat = cleanCat.replace(/\b\w/g, char => char.toUpperCase());

          categoryTotals[formattedCat] = (categoryTotals[formattedCat] || 0) + Math.abs(amount);
        }
      }
    });

    // 6. Format the Pie Chart Array
    const colors = ['#facc15', '#ec4899', '#7f1d1d', '#000000', '#14b8a6', '#3b82f6', '#ef4444', '#f97316'];
    const pieData = Object.keys(categoryTotals).map((key, index) => ({
      text: key,
      value: categoryTotals[key],
      color: colors[index % colors.length],
    }));

    // 7. Calculate Budget Percentage
    const budgetPercentage = budgetLimit > 0 ? Math.min((expense / budgetLimit) * 100, 100) : 0;

    // 8. Send to mobile app
    return NextResponse.json({
      totalBalance,
      accounts,     
      income,           
      expense,          
      transactions,     
      budgetLimit,      
      budgetPercentage, 
      pieData           
    }, { status: 200 });

  } catch (error) {
    console.error("MOBILE DASHBOARD ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}