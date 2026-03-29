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
    const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance), 0);
    const defaultAccount = accounts.find(a => a.isDefault === true) || accounts[0];

    const userRecord = await db.user.findUnique({
      where: { id: userId },
      select: { monthlyBudget: true }
    });
    const budgetLimit = defaultAccount?.monthlyBudget || userRecord?.monthlyBudget || 0; 

    const transactions = await db.transaction.findMany({
      where: { 
        userId: userId,
        accountId: defaultAccount?.id
      },
      orderBy: { date: "desc" }, 
      include: { account: { select: { name: true } } }
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    let income = 0;
    let expense = 0;
    const categoryTotals = {};

    transactions.forEach(t => {
      const amount = Number(t.amount);
      const txDate = new Date(t.date);

      if (txDate >= startOfMonth && txDate <= endOfMonth) {
        if (t.type === "INCOME") {
          income += Math.abs(amount);
        } else if (t.type === "EXPENSE") {
          expense += Math.abs(amount);

          let rawCat = t.category || 'Uncategorized';
          let cleanCat = rawCat.toLowerCase().replace(/-/g, ' ');
          let formattedCat = cleanCat.replace(/\b\w/g, char => char.toUpperCase());

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

    const budgetPercentage = budgetLimit > 0 ? Math.min((expense / budgetLimit) * 100, 100) : 0;

    return {
      totalBalance,
      accounts: accounts.map(serializeTransaction),     
      income,           
      expense,          
      transactions: transactions.map(serializeTransaction),     
      budgetLimit,      
      budgetPercentage, 
      pieData           
    };
}
