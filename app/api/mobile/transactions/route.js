import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { decrypt } from "@/lib/auth";

export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const token = authHeader.split(" ")[1];
    const payload = await decrypt(token);
    if (!payload || !payload.userId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const body = await req.json();
    const { type, amount, accountId, category, date, description, isRecurring } = body;

    // 1. Create the Transaction
    const transaction = await db.transaction.create({
      data: {
        userId: payload.userId,
        accountId,
        type,
        amount,
        category,
        date: new Date(date),
        description: description || "Mobile Transaction",
        isRecurring: isRecurring || false,
        status: "COMPLETED",
      }
    });

    // 2. Update the Account Balance
    const balanceChange = type === "EXPENSE" ? -amount : amount;
    await db.account.update({
      where: { id: accountId },
      data: { balance: { increment: balanceChange } }
    });

    return NextResponse.json({ success: true, transaction }, { status: 200 });

  } catch (error) {
    console.error("CREATE TRANSACTION ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}