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

    const accounts = await db.account.findMany({
      where: { userId: userId },
      orderBy: { isDefault: "desc" }, 
    });

    const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance), 0);

    const defaultAccount = accounts.find(a => a.isDefault) || accounts[0];

    const transactions = await db.transaction.findMany({
      where: { userId: userId, accountId: defaultAccount.id },
      orderBy: { date: "desc" }, 
      include: {
        account: {
          select: { name: true } 
        }
      }
    });

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { monthlyBudget: true }
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
      const amount = Number(t.amount);
      const txDate = new Date(t.date);
      if (txDate >= startOfMonth && txDate <= endOfMonth) {
        if (t.type === "INCOME") {
          income += Math.abs(amount);
        } else if (t.type === "EXPENSE") {
          expense += Math.abs(amount);
        }
      }
    });

    return NextResponse.json({
      totalBalance,
      accounts,     
      income,
      expense,
      transactions,
      Budget: defaultAccount.monthlyBudget || 0
    }, { status: 200 });

  } catch (error) {
    console.error("MOBILE DASHBOARD ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}