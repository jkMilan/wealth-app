import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { sendEmail } from "@/actions/send-email";
import EmailTemplate from "@/emails/template";

export async function POST(req) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  try {
    const users = await db.user.findMany({
      include: { accounts: true }
    });

    for (const user of users) {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const stats = await getMonthlyStats(user.id, lastMonth);
      const monthName = lastMonth.toLocaleString("default", { month: "long" });
      const insights = await generateFinancialInsights(stats, monthName);
      await sendEmail({
        to: user.email,
        subject: `Your Monthly Financial Report for ${monthName}`,
        react: (
          <EmailTemplate
            userName={user.name}
            type="monthly-report"
            data={{
              stats,
              month: monthName,
              insights,
            }}
          />
        ),
      });
    }

    return NextResponse.json({ success: true, processed: users.length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Include your existing getMonthlyStats and generateFinancialInsights helper functions here
const getMonthlyStats = async (userId, month) => { 
  const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
  const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  const transactions = await db.transaction.findMany({
    where: {
      userId: userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  let totalIncome = 0;
  let totalExpenses = 0;
  const byCategory = {};

  transactions.forEach((t) => {
    const amount = t.amount.toNumber();
    if (t.type === "INCOME") {
      totalIncome += amount;
    } else if (t.type === "EXPENSE") {
      totalExpenses += amount;
      const category = t.category || "Uncategorized";
      byCategory[category] = (byCategory[category] || 0) + amount;
    }
  });

  return { totalIncome, totalExpenses, byCategory };
 };
async function generateFinancialInsights(stats, month) { 
  const insights = [];

  if (stats.totalIncome === 0 && stats.totalExpenses === 0) {
    return ["No transactions recorded for this month."];
  }

  if (stats.totalIncome > stats.totalExpenses) {
    insights.push(`Great job! You saved LKR ${stats.totalIncome - stats.totalExpenses} in ${month}.`);
  } else if (stats.totalExpenses > stats.totalIncome) {
    insights.push(`Watch out! Your expenses exceeded your income by LKR ${stats.totalExpenses - stats.totalIncome}.`);
  }

  if (Object.keys(stats.byCategory).length > 0) {
    const highestCategory = Object.keys(stats.byCategory).reduce((a, b) =>
      stats.byCategory[a] > stats.byCategory[b] ? a : b
    );
    insights.push(`Your highest expense category was ${highestCategory} (LKR ${stats.byCategory[highestCategory]}).`);
  }

  return insights;
 }