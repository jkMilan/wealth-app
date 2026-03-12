import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma'; 

export async function POST(req) {
  try {
    const body = await req.json();
    console.log("SUCCESS! RECEIVED SMS DATA:", body); 
    
    // Add a secret key so only your iPhone can trigger this
    const { message, sender, secretKey } = body;

    // Change this to whatever you want, and add it to your iPhone Shortcut JSON body!
    if (secretKey !== "Milan2908") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    
    // FIX 2: Added 'category' to the destructuring
    const { amount, type, merchant, category } = aiData;

    if (amount > 0) {
      // FIX 3: Assuming for now this is just for you. 
      // If you add multiple users later, pass the userId from the iPhone shortcut instead of the secretKey.
      const defaultAccount = await db.account.findFirst({
        where: { isDefault: true } 
      });

      if (!defaultAccount) {
        console.error("Error: No default account found in the database!");
        return NextResponse.json({ error: 'No default account' }, { status: 400 });
      }

      // Calculate how the balance should change
      const balanceChange = type === 'EXPENSE' ? -amount : amount;

      // FIX 1: Use $transaction to update the ledger AND the account balance together
      await db.$transaction(async (tx) => {
        // Create the transaction
        await tx.transaction.create({
          data: {
            amount: amount, // Keep amount positive in the DB to match your UI logic
            description: `SMS: ${merchant}`,
            date: new Date(),
            type: type,
            category: category, // Save the AI category!
            accountId: defaultAccount.id,
            userId: defaultAccount.userId // Ensure it links to the account owner
          }
        });

        // Update the account balance
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