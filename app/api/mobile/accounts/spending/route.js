import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { decrypt } from "@/lib/auth";

export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];
    const payload = await decrypt(token);

    if (!payload?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transactions = await db.transaction.findMany({
      where: {
        userId: payload.userId,
        type: "EXPENSE", 
      },
    });

    const categoryTotals = {};
    
    transactions.forEach((t) => {
      let rawCategory = t.category || "Uncategorized";
      let normalized = rawCategory.toLowerCase().trim().replace(/-/g, " ");
      
      let displayCategory = normalized.replace(/\b\w/g, (char) => char.toUpperCase());

      if (!categoryTotals[displayCategory]) {
        categoryTotals[displayCategory] = 0;
      }
      categoryTotals[displayCategory] += parseFloat(t.amount);
    });

    const COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#f97316', '#06b6d4', '#71717a'];
    
    const chartData = Object.keys(categoryTotals).map((key, index) => ({
      text: key,
      value: categoryTotals[key],
      color: COLORS[index % COLORS.length], 
    }));

    chartData.sort((a, b) => b.value - a.value);

    return NextResponse.json(chartData, { status: 200 });
  } catch (error) {
    console.error("SPENDING CHART ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}