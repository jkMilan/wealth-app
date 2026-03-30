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
    const { type, amount, accountId, category, date, description, isRecurring, recurringInterval } = body;

    const result = await db.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId: payload.userId,
          accountId,
          type,
          amount: parseFloat(amount),
          category,
          date: new Date(date),
          description: description || "Mobile Transaction",
          isRecurring: isRecurring || false,
          recurringInterval: isRecurring ? recurringInterval : null,
          status: "COMPLETED",
        }
      });

      const balanceChange = type === "EXPENSE" ? -parseFloat(amount) : parseFloat(amount);
      await tx.account.update({
        where: { id: accountId },
        data: { balance: { increment: balanceChange } }
      });

      return transaction;
    });

    return NextResponse.json({ success: true, transaction: result }, { status: 200 });

  } catch (error) {
    console.error("CREATE TRANSACTION ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}