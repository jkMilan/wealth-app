// app/api/auth/register/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { setAuthCookie } from "@/lib/auth";

export async function POST(req) {
  try {
    const { email, password, name } = await req.json();

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.user.create({
      data: { email, passwordHash, name },
    });

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
    console.error("REGISTER ERROR: ", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}