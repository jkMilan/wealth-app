"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import aj from "@/lib/arcjet";
import { request } from "@arcjet/next";

const serializeAmount = (obj) => ({
    ...obj,
    amount: obj.amount.toNumber(),
});

export async function createTransaction(data) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        // Arcjet to add rate limiting
        const req = await request();
        // Check rate limit
        const decision = await aj.protect(req, {
            userId,
            requested: 1, // Specify how many tokens to consume
        });

        if (decision.isDenied()) {
            if (decision.reason.isRateLimit()) {
                const { remaining, reset } = decision.reason;
                console.error({
                    code: "RATE_LIMIT_EXCEEDED",
                    details: {
                        remaining,
                        resetInSeconds: reset,
                    }
                });

                throw new Error("Too many requests. Please try again later.");
            }

            throw new Error("Request Blocked.");
        }

        const user = await db.user.findUnique({
            where: { clerkUserId: userId }
        });
        if (!user) {
            throw new Error("User not found");
        }

        const account = await db.account.findUnique({
            where: { id: data.accountId, userId: user.id }
        });
        if (!account) {
            throw new Error("Account not found");
        }

        const balanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;
        const newBalance = account.balance.toNumber() + balanceChange;

        const transaction = await db.$transaction(async (tx) => {
            const newTransaction = await tx.transaction.create({
                data: {
                    ...data,
                    userId: user.id,
                    nextRecurringDate: data.isRecurring && data.recurringInterval ? calculateNextRecurringDate(data.date, data.recurringInterval) : null,
                },
            });

            await tx.account.update({
                where: { id: data.accountId },
                data: { balance: newBalance },
            });

            return newTransaction;
        });

        revalidatePath("/dashboard");
        revalidatePath(`/account/${transaction.accountId}`);

        return { success: true, data: serializeAmount(transaction) };
    } catch (error) {
        throw new Error(error.message);
    }
}

//Helper function to calculate the next recurring date
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

export async function scanReceipt(file) {
    try {
        // Prepare the image to be sent to Python via FormData
        const formData = new FormData();
        formData.append("file", file);

        // Send to your local Python FastAPI server
        const response = await fetch("http://127.0.0.1:8000/api/ml/ocr", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Python ML Service Error: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error("Failed to parse receipt data.");
        }

        return {
            amount: parseFloat(data.amount) || 0,
            date: data.date ? new Date(data.date) : new Date(),
            description: data.description || "Scanned Receipt",
            merchantName: data.merchantName || "Unknown Merchant",
            category: data.category || "other-expense",
        };

    } catch (error) {
        console.error("OCR API Error:", error);
        throw new Error("Failed to scan receipt via ML service.");
    }
}

export async function getTransaction(id) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    const transaction = await db.transaction.findUnique({
        where: { id, userId: user.id },
    });

    if (!transaction) throw new Error("Transaction not found");

    return serializeAmount(transaction);
}

export async function updateTransaction(id, data) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const user = await db.user.findUnique({
            where: { clerkUserId: userId },
        });

        if (!user) throw new Error("User not found");

        const originalTransaction = await db.transaction.findUnique({
            where: { id, userId: user.id },
            include: { account: true },
        });

        if (!originalTransaction) throw new Error("Transaction not found");

        const oldBalanceChange = originalTransaction.type === "EXPENSE" ? -originalTransaction.amount.toNumber() : originalTransaction.amount.toNumber();
        const newBalanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;

        const netBalanceChange = newBalanceChange - oldBalanceChange;

        const transaction = await db.$transaction(async (tx) => {
            const updated = await tx.transaction.update({
                where: { id, userId: user.id },
                data: {
                    ...data,
                    nextRecurringDate: data.isRecurring && data.recurringInterval ? calculateNextRecurringDate(data.date, data.recurringInterval) : null,
                },
            });

            if (data.accountId !== originalTransaction.accountId) {
                await tx.account.update({
                    where: { id: originalTransaction.accountId },
                    data: { balance: { decrement: oldBalanceChange } },
                });
                await tx.account.update({
                    where: { id: data.accountId },
                    data: { balance: { increment: newBalanceChange } },
                });
            } else {
                await tx.account.update({
                    where: { id: data.accountId },
                    data: { balance: { increment: netBalanceChange } },
                });
            }

            return updated;
        });

        revalidatePath("/dashboard");
        revalidatePath(`/account/${data.accountId}`);

        return { success: true, data: serializeAmount(transaction) };
    } catch (error) {
        throw new Error(error.message);
    }
}

export async function deleteTransaction(id) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const user = await db.user.findUnique({
            where: { clerkUserId: userId },
        });

        if (!user) throw new Error("User not found");

        // 1. Find the transaction to get its amount, type, and accountId
        const transaction = await db.transaction.findUnique({
            where: { id, userId: user.id },
        });

        if (!transaction) throw new Error("Transaction not found");

        // 2. Reverse the balance change
        // If it was an EXPENSE, deleting it gives money back (increment).
        // If it was INCOME, deleting it takes money away (decrement).
        const balanceChange = transaction.type === "EXPENSE" 
            ? transaction.amount.toNumber() 
            : -transaction.amount.toNumber();

        // 3. Delete transaction and update account balance in a single transaction block
        await db.$transaction(async (tx) => {
            await tx.transaction.delete({
                where: { id },
            });

            await tx.account.update({
                where: { id: transaction.accountId },
                data: { balance: { increment: balanceChange } },
            });
        });

        // 4. Update the UI
        revalidatePath("/dashboard");
        revalidatePath(`/account/${transaction.accountId}`);

        return { success: true };
    } catch (error) {
        throw new Error(error.message);
    }
}