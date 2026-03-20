import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { sendEmail } from "@/actions/send-email";
import EmailTemplate from "@/emails/template";

export async function POST(req) {
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
const getMonthlyStats = async (userId, month) => { /* ... existing code ... */ };
async function generateFinancialInsights(stats, month) { /* ... existing code ... */ }