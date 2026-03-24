import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma'; 


export async function POST(req) {
  try {
    const body = await req.json();
    console.log("SUCCESS! RECEIVED SMS DATA:", body); 
    
    const { message, sender, secretKey } = body;

    if (secretKey !== "Milan2908") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawUrl = (process.env.ML_SERVICE_URL || "http://127.0.0.1:8000").trim().replace(/\/$/, "");
    const finalUrl = `${rawUrl}/api/ml/sms`;

    console.log("SMS AI FETCH URL:", finalUrl);

    const pythonResponse = await fetch(finalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ message, sender })
    });

    if (!pythonResponse.ok) {
        throw new Error(`ML Service Error: ${pythonResponse.statusText}`);
    }

    const aiData = await pythonResponse.json();
    const { amount, type, merchant, category } = aiData;

    if (amount > 0) {
      const defaultAccount = await db.account.findFirst({
        where: { isDefault: true } 
      });

      if (!defaultAccount) {
        console.error("Error: No default account found in the database!");
        return NextResponse.json({ error: 'No default account' }, { status: 400 });
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
            userId: defaultAccount.userId 
          }
        });

        await tx.account.update({
            where: { id: defaultAccount.id },
            data: { balance: { increment: balanceChange } },
        });
      });

      console.log(`Saved ${type}: Rs. ${amount} at ${merchant} | Category: ${category}`);
    }

    return NextResponse.json({ success: true, parsedAmount: amount, type, category });
  } catch (error) {
    console.error("SMS Ingest Error:", error);
    return NextResponse.json({ error: 'Failed to process SMS' }, { status: 500 });
  }
}