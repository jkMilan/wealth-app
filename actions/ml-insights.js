"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function getFinancialProfile() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    // 1. Calculate user's totals from the database
    // Note: Adjust the 'type' string if your DB uses different casing (e.g., 'income' vs 'INCOME')
    const transactions = await db.transaction.findMany({
      where: { account: { userId } },
    });

    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach((t) => {
      if (t.type === 'INCOME') totalIncome += Number(t.amount);
      if (t.type === 'EXPENSE') totalExpenses += Math.abs(Number(t.amount));
    });

    // 2. Fetch Clustering Profile from Local Python Service
    const clusterRes = await fetch('http://127.0.0.1:8000/api/ml/cluster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        monthly_income: totalIncome,
        monthly_expenses: totalExpenses,
        transaction_count: transactions.length
      }),
      cache: 'no-store' // Keep insights fresh
    });

    const clusterData = await clusterRes.json();

    // 3. Mock some historical data for the prediction (In a real app, group transactions by month)
    // Here we pass a simple dummy history to get the prediction working immediately
    const predictRes = await fetch('http://127.0.0.1:8000/api/ml/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        historical_data: [
          { month_index: 1, net_cash_flow: 500 },
          { month_index: 2, net_cash_flow: 700 },
          { month_index: 3, net_cash_flow: (totalIncome - totalExpenses) }
        ]
      }),
      cache: 'no-store'
    });

    const predictData = await predictRes.json();

    return {
      profile: clusterData.profile,
      advice: clusterData.custom_advice,
      savingsRate: clusterData.savings_rate,
      prediction: predictData
    };

  } catch (error) {
    console.error("Failed to fetch ML insights:", error);
    return null; // Return null if the Python server is offline
  }
}