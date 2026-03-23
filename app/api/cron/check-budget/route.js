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
    const budgets = await db.budget.findMany({
      include: {
        user: { include: { accounts: { where: { isDefault: true } } } }
      }
    });

    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

    for (const budget of budgets) {
      const defaultAccount = budget.user.accounts[0];
      if (!defaultAccount) continue;

      const expenses = await db.transaction.aggregate({
        where: {
          userId: budget.userId, accountId: defaultAccount.id, type: "EXPENSE",
          date: { gte: startOfMonth, lte: endOfMonth }
        },
        _sum: { amount: true }
      });

      const totalExpenses = Number(expenses._sum.amount || 0);
      const budgetAmount = Number(budget.amount);
      if (budgetAmount === 0) continue;

      const percentageUsed = (totalExpenses / budgetAmount) * 100;
      const shouldSendAlert = percentageUsed >= 80 && 
        (!budget.lastAlertSent || isNewMonth(budget.lastAlertSent, currentDate));

      if (shouldSendAlert) {
        await sendEmail({
          to: budget.user.email,
          subject: `Budget Alert for ${defaultAccount.name}`,
          react: (
            <EmailTemplate
              userName={budget.user.name}
              type="budget-alert"
              data={{
                percentageUsed: percentageUsed,
                budgetAmount: budgetAmount,
                totalExpenses: totalExpenses,
                accountName: defaultAccount.name, 
              }}
            />
          ),
        });

        await db.budget.update({
          where: { id: budget.id },
          data: { lastAlertSent: new Date() },
        });
      }
    }

    return NextResponse.json({ success: true, message: "Budget alerts checked" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function isNewMonth(lastAlertDate, currentDate) {
  return lastAlertDate.getMonth() !== currentDate.getMonth() || lastAlertDate.getFullYear() !== currentDate.getFullYear();
}