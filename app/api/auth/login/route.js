import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { setAuthCookie } from "@/lib/auth";

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await setAuthCookie(user.id);

    return NextResponse.json(
      { 
        success: true, 
        user: { 
          id: user.id, 
          email: user.email 
        },
        token: token 
      });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}