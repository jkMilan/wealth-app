import { NextResponse } from "next/server";
import { decrypt } from "@/lib/auth";
import { getDashboardData } from "@/actions/dashboard"; 

export async function GET(req) {
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
    
    const dashboardData = await getDashboardData(payload.userId);

    return NextResponse.json(dashboardData, { status: 200 });

  } catch (error) {
    console.error("MOBILE DASHBOARD ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}