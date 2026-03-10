import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma'; 

export async function POST(req) {
  try {
    const body = await req.json();
    console.log("SUCCESS! RECEIVED SMS DATA:", body); 
    
    const { message, sender } = body;

    // 1. Send the raw SMS to your local Python ML Service
    const pythonResponse = await fetch('http://127.0.0.1:8000/api/ml/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sender })
    });

    if (!pythonResponse.ok) {
        throw new Error("Failed to process SMS through local AI");
    }

    const aiData = await pythonResponse.json();
    const { amount, type, merchant } = aiData;

    if (amount > 0) {
      const defaultAccount = await db.account.findFirst({
        where: { isDefault: true }
      });

      if (!defaultAccount) {
        console.error("Error: No default account found in the database!");
        return NextResponse.json({ error: 'No default account' }, { status: 400 });
      }

      // 2. Save the transaction with the highly accurate AI-parsed data
      await db.transaction.create({
        data: {
          amount: type === 'EXPENSE' ? -amount : amount,
          description: `SMS: ${merchant}`,
          date: new Date(),
          type: type,
          accountId: defaultAccount.id, 
        }
      });
      console.log(`Saved ${type} of Rs. ${amount} to database!`);
    }

    return NextResponse.json({ success: true, parsedAmount: amount, type });
  } catch (error) {
    console.error("SMS Ingest Error:", error);
    return NextResponse.json({ error: 'Failed to process SMS' }, { status: 500 });
  }
}