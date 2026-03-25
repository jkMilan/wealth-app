import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { decrypt } from '@/lib/auth'; // Bring in your decrypter!

export async function POST(req) {
  try {
    let userId = null;
    
    // 1. Check if the request is coming from your logged-in mobile app
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const payload = await decrypt(token);
      if (payload && payload.userId) {
        userId = payload.userId; // We know exactly who this is!
      }
    }

    const body = await req.json();
    const { message, sender, secretKey } = body;

    // 2. Security Check: Must have EITHER a valid token OR the secret key
    if (!userId && secretKey !== "Milan2908") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Send to AWS / ML Service
    const rawUrl = (process.env.ML_SERVICE_URL || "http://127.0.0.1:8000").trim().replace(/\/$/, "");
    const finalUrl = `${rawUrl}/api/ml/sms`;

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
      // 4. SMART DATABASE QUERY:
      // If we have a userId, find THEIR default account. 
      // If we don't, fallback to a global default.
      const accountQuery = userId 
        ? { userId: userId, isDefault: true } 
        : { isDefault: true };

      const defaultAccount = await db.account.findFirst({
        where: accountQuery
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
            userId: defaultAccount.userId 
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