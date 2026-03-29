"use server";

import { checkUser } from "@/lib/checkUser";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const serializeTransaction = (obj) => {
    const serialized = { ...obj };

    if (obj.balance) {
        serialized.balance = obj.balance.toNumber();
    }
    if (obj.amount) {
        serialized.amount = obj.amount.toNumber();
    }
    return serialized;
};

export async function createAccount(data) {
    try {
        const user = await checkUser();
        if (!user) throw new Error("Unauthorized");

        const balanceFloat = parseFloat(data.balance);
        if (isNaN(balanceFloat)) {
            throw new Error("Invalid balance amount");
        }

        const existingAccounts = await db.account.findMany({
            where: { userId: user.id },
        });

        const shouldBeDefault = existingAccounts.length === 0 ? true : data.isDefault;

        if (shouldBeDefault) {
            await db.account.updateMany({
                where: { userId: user.id, isDefault: true },
                data: { isDefault: false },
            });
        }

        const account = await db.account.create({
            data: {
                ...data,
                balance: balanceFloat,
                isDefault: shouldBeDefault,
                userId: user.id
            }
        });

        const serializeAccount = serializeTransaction(account);

        revalidatePath("/dashboard");
        return { success: true, account: serializeAccount };
    } catch (error) {
        throw new Error(error.message);
    }
}

export async function getUserAccounts() {
    const user = await checkUser();
    if (!user) throw new Error("Unauthorized");

    const accounts = await db.account.findMany({
        where: { userId: user.id },
        orderBy: {
            createdAt: "desc"
        },
        include: {
            _count: {
                select: {
                    transactions: true,
                },
            },
        },
    });

    const serializeAccount = accounts.map(serializeTransaction);

    return serializeAccount;
}

export async function getDashboardData(mobileUserId = null) {
    let userId = mobileUserId;
    if (!userId) {
        const user = await checkUser(); 
        userId = user?.id;
    }
    if (!userId) throw new Error("Unauthorized");

    const accounts = await db.account.findMany({
      where: { userId: userId },
      orderBy: { isDefault: "desc" }, 
    });
    const defaultAccount = accounts.find(a => a.isDefault === true) || accounts[0];

    // Fetch ALL transactions for the "Recent" list
    const transactions = await db.transaction.findMany({
      where: { userId: userId, accountId: defaultAccount?.id },
      orderBy: { date: "desc" }, 
      include: { account: { select: { name: true } } }
    });

    // --- MATH FOR "THIS MONTH" ONLY ---
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    let income = 0;
    let expense = 0;
    const categoryTotals = {};

    transactions.forEach(t => {
      const amount = Number(t.amount);
      const txDate = new Date(t.date);

      // ONLY add to Pie Chart and Totals if it happened THIS MONTH
      if (txDate >= startOfMonth && txDate <= endOfMonth) {
        if (t.type === "INCOME") {
          income += Math.abs(amount);
        } else if (t.type === "EXPENSE") {
          expense += Math.abs(amount);

          let formattedCat = (t.category || 'Uncategorized')
            .toLowerCase().replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());

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

    return {
      totalBalance: accounts.reduce((sum, a) => sum + Number(a.balance), 0),
      accounts: accounts.map(serializeTransaction),     
      income,           
      expense,          
      transactions: transactions.map(serializeTransaction),     
      budgetLimit: defaultAccount?.monthlyBudget || 0,      
      budgetPercentage: defaultAccount?.monthlyBudget > 0 ? Math.min((expense / defaultAccount.monthlyBudget) * 100, 100) : 0, 
      pieData           
    };
}
