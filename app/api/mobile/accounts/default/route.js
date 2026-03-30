import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { decrypt } from "@/lib/auth";

export async function POST(req) {
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

    const { accountId } = await req.json();

    // if (!accountId) {
    //   return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    // }

    await db.$transaction([
      db.account.updateMany({
        where: { userId: payload.userId, isDefault: true },
        data: { isDefault: false },
      }),
      db.account.update({
        where: { id: accountId, userId: payload.userId },
        data: { isDefault: true },
      }),
    ]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("SET DEFAULT ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}