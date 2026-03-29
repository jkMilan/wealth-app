"use server";

import { checkUser } from "@/lib/checkUser";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const getCurrentBudget = async (accountId) => {
    try {
        const user = await checkUser();
        if (!user) throw new Error("Unauthorized");
        if (!accountId) return null;

        const budget = await db.budget.findFirst({
            where: {
                userId: user.id,
                accountId: accountId,
            },
        });

        const currenDate = new Date();
        const startOfMonth = new Date(
            currenDate.getFullYear(),
            currenDate.getMonth(),
            1
        );
        const endOfMonth = new Date(
            currenDate.getFullYear(),
            currenDate.getMonth() + 1,
            0
        );

        const expanses = await db.transaction.aggregate({
            where: {
                userId: user.id,
                accountId: accountId,
                type: "EXPENSE",
                date: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
            },
            _sum: {
                amount: true,
            },
        });

        return {
            budget: budget ? { ...budget, amount: budget.amount.toNumber() } : null,
            currentExpanses: expanses._sum.amount
                ? expanses._sum.amount.toNumber()
                : 0,
        };
    } catch (error) {
        console.log("Error fetching budget", error);
        throw error;
    }
}

export async function updateBudget(accountId, amount) {
    try {
        const user = await checkUser();
        if (!user) throw new Error("Unauthorized");

        const budget = await db.budget.upsert({
            where: {
                accountId: accountId,
            },
            update: {
                amount,
            },
            create: {
                userId: user.id,
                accountId: accountId,
                amount,
            },
        });

        revalidatePath("/dashboard");
        return {
            success: true,
            data: { ...budget, amount: budget.amount.toNumber() },
        };
    } catch (error) {
        console.error("Error updating budget", error);
        return { success: false, error: error.message };
    }
}

export async function deleteBudget(accountId) {
    try {
        const user = await checkUser();
        if (!user) throw new Error("Unauthorized");
        
        // Ensure accountId is present
        if (!accountId) throw new Error("Account ID is required");

        // Delete the budget linked to this specific account
        await db.budget.delete({
            where: {
                accountId: accountId,
            },
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error deleting budget", error);
        return { success: false, error: error.message };
    }
}