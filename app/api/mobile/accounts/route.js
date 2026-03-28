import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { decrypt } from "@/lib/auth";

export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];
    const payload = await decrypt(token);

    if (!payload?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, type, balance } = await req.json();

    if (!name || !balance) {
      return NextResponse.json({ error: "Name and Balance are required" }, { status: 400 });
    }

    const newAccount = await db.account.create({
      data: {
        name,
        type: type.toUpperCase(),
        balance: parseFloat(balance),
        userId: payload.userId,
      },
    });

    return NextResponse.json(newAccount, { status: 201 });
  } catch (error) {
    console.error("ADD ACCOUNT ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}