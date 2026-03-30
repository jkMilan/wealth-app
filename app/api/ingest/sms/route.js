import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { decrypt } from '@/lib/auth';

export async function POST(req) {
  try {
    let userId = null;
    
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const payload = await decrypt(token);
      if (payload?.userId) userId = payload.userId;
    }

    const body = await req.json();
    const { message, sender, secretKey, bodyUserId } = body; 

    if (!userId && secretKey !== "Milan2908") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const finalUserId = userId || bodyUserId;
    if (!finalUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const rawUrl = (process.env.ML_SERVICE_URL || "http://127.0.0.1:8000").trim().replace(/\/$/, "");
    const finalUrl = `${rawUrl}/api/ml/sms`;

    const pythonResponse = await fetch(finalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ message, sender })
    });

    if (!pythonResponse.ok) throw new Error(`ML Service Error: ${pythonResponse.statusText}`);

    const { amount, type, merchant, category } = await pythonResponse.json();

    if (amount > 0) {
      const defaultAccount = await db.account.findFirst({
        where: { userId: finalUserId, isDefault: true } 
      });

      if (!defaultAccount) {
        return NextResponse.json({ error: 'No default account found for this user' }, { status: 400 });
      }

      const balanceChange = type === 'EXPENSE' ? -amount : amount;

      await db.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            amount: amount, 
            description: `SMS: ${merchant}`,
            date: new Date(),
            type: type,
            category: category, 
            accountId: defaultAccount.id,
            userId: finalUserId 
          }
        });

        await tx.account.update({
            where: { id: defaultAccount.id },
            data: { balance: { increment: balanceChange } },
        });
      });
    }

    return NextResponse.json({ success: true, parsedAmount: amount, type, category });
  } catch (error) {
    console.error("SMS Ingest Error:", error);
    return NextResponse.json({ error: 'Failed to process SMS' }, { status: 500 });
  }
}