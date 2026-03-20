import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function POST(req) {
  try {
    // 1. Fetch all due recurring transactions
    const recurringTransactions = await db.transaction.findMany({
      where: {
        isRecurring: true,
        status: "COMPLETED",
        OR: [
          { lastProcessed: null },
          { nextRecurringDate: { lte: new Date() } },
        ],
      },
    });

    if (recurringTransactions.length === 0) {
      return NextResponse.json({ message: "No recurring transactions due" });
    }

    let processedCount = 0;

    // 2. Process each transaction
    for (const transaction of recurringTransactions) {
      await db.$transaction(async (tx) => {
        // Create new transaction
        await tx.transaction.create({
          data: {
            type: transaction.type,
            amount: transaction.amount,
            description: `${transaction.description} (Recurring)`,
            date: new Date(),
            category: transaction.category,
            accountId: transaction.accountId,
            userId: transaction.userId,
            isRecurring: false,
          },
        });

        // Update account balance
        const balanceChange =
          transaction.type === "EXPENSE"
            ? -transaction.amount.toNumber()
            : transaction.amount.toNumber();

        await tx.account.update({
          where: { id: transaction.accountId },
          data: { balance: { increment: balanceChange } },
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
      processedCount++;
    }

    return NextResponse.json({ success: true, processed: processedCount });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function calculateNextRecurringDate(startDate, interval) {
  const date = new Date(startDate);
  switch (interval) {
    case "DAILY": date.setDate(date.getDate() + 1); break;
    case "WEEKLY": date.setDate(date.getDate() + 7); break;
    case "MONTHLY": date.setMonth(date.getMonth() + 1); break;
    case "YEARLY": date.setFullYear(date.getFullYear() + 1); break;
  }
  return date;
}