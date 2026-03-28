import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { decrypt } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    const resolvedParams = await params;
    const accountId = resolvedParams.id;

    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const token = authHeader.split(" ")[1];
    const payload = await decrypt(token);
    
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const userId = payload.userId;

    const account = await db.account.findUnique({
      where: { id: accountId }
    });
    console.log(`Searching for: ${accountId}`);
    console.log(`Logged in User: ${userId}`);
    if (account) console.log(`Account Owner in DB: ${account.userId}`);

    if (!account || account.userId !== userId) {
        return NextResponse.json({ error: "Account not found or unauthorized" }, { status: 404 });
    }

    const transactions = await db.transaction.findMany({
      where: { 
        userId: userId,
        accountId: accountId
      },
      orderBy: { date: "desc" },
      take: 50
    });

    return NextResponse.json({ account, transactions }, { status: 200 });

  } catch (error) {
    console.error("MOBILE ACCOUNT DETAILS ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}