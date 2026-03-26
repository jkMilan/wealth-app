import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { decrypt } from "@/lib/auth";

// Notice the { params } argument here! That is how Next.js grabs the [id] from the folder name.
export async function GET(req, { params }) {
  try {
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

    // Grab the ID from the URL
    const accountId = params.id;

    // 1. Fetch the specific account to ensure it belongs to this user
    const account = await db.account.findUnique({
      where: { 
        id: accountId,
      }
    });

    if (!account || account.userId !== userId) {
        return NextResponse.json({ error: "Account not found or unauthorized" }, { status: 404 });
    }

    // 2. Fetch only the transactions tied to this specific account
    const transactions = await db.transaction.findMany({
      where: { 
        userId: userId,
        accountId: accountId
      },
      orderBy: { 
        date: "desc" 
      },
      take: 50 // Optional: limit to the 50 most recent to keep the mobile app fast
    });

    return NextResponse.json({ 
      account,
      transactions 
    }, { status: 200 });

  } catch (error) {
    console.error("MOBILE ACCOUNT DETAILS ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}