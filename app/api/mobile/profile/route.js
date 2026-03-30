import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { decrypt } from "@/lib/auth";

export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const token = authHeader.split(" ")[1];
    const payload = await decrypt(token);
    if (!payload || !payload.userId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];
    const payload = await decrypt(token);
    if (!payload?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name } = await req.json();

    const updatedUser = await db.user.update({
      where: { id: payload.userId },
      data: { name },
    });

    return NextResponse.json({ success: true, user: updatedUser }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}