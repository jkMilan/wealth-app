"use server";

import { checkUser } from "@/lib/checkUser";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const getCurrentBudget = async () => {
    try {
        const user = await checkUser();
        if (!user) throw new Error("Unauthorized");

        const budget = await db.budget.findFirst({
            where: {
                userId: user.id,
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

export async function updateBudget(amount) {
    try {
        const user = await checkUser();
        if (!user) throw new Error("Unauthorized");

        const budget = await db.budget.upsert({
            where: {
                userId: user.id,
            },
            update: {
                amount,
            },
            create: {
                userId: user.id,
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
