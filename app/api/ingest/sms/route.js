import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma'; 

export async function POST(req) {
  try {
    const body = await req.json();
    
    // This will print the incoming iPhone data in your terminal!
    console.log("SUCCESS! RECEIVED SMS DATA:", body); 
    
    const { message, sender } = body;

    const amountMatch = message.match(/(?:rs\.?|usd|\$)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

    const isExpense = /debited|spent|paid|sent/i.test(message);
    const type = isExpense ? 'EXPENSE' : 'INCOME';

    if (amount > 0) {
      // 1. Automatically find your default account in the database
      const defaultAccount = await db.account.findFirst({
        where: { isDefault: true }
      });

      if (!defaultAccount) {
        console.error("Error: No default account found in the database!");
        return NextResponse.json({ error: 'No default account' }, { status: 400 });
      }

      // 2. Save the transaction to that specific account
      await db.transaction.create({
        data: {
          amount: type === 'EXPENSE' ? -amount : amount,
          description: `SMS from ${sender}: ${message.substring(0, 30)}...`,
          date: new Date(),
          type: type,
          accountId: defaultAccount.id, // Uses the real ID dynamically!
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