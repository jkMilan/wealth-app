import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { decrypt } from "@/lib/auth";

export async function GET(req) {
  try {
    // 1. Grab the secure token from the iPhone's request headers
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];

    // 2. Decrypt the token to figure out exactly who is asking
    const payload = await decrypt(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const userId = payload.userId;

    // 3. Fetch their recent transactions from Prisma
    const transactions = await db.transaction.findMany({
      where: { userId: userId },
      orderBy: { date: "desc" }, // Assuming your schema uses 'date', change to 'createdAt' if needed
      take: 20,
    });

    // 4. Calculate the totals for the Dashboard Cards
    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
      // Adjust this based on how your Prisma schema tracks expenses
      if (t.type === "INCOME" || t.amount > 0) income += Math.abs(parseFloat(t.amount));
      if (t.type === "EXPENSE" || t.amount < 0) expense += Math.abs(parseFloat(t.amount));
    });

    const balance = income - expense;

    // 5. Send it all back to the iPhone
    return NextResponse.json({
      balance,
      income,
      expense,
      transactions
    }, { status: 200 });

  } catch (error) {
    console.error("MOBILE DASHBOARD ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}