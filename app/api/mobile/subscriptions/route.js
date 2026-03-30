import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { decrypt } from "@/lib/auth";
import { defaultCategories } from "@/data/categories"; 

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
    const userId = payload.userId;

    const recurringTransactions = await db.transaction.findMany({
      where: { 
        userId: userId,
        isRecurring: true 
      },
      orderBy: { 
        createdAt: "desc" 
      },
    });

    const enrichedSubscriptions = recurringTransactions.map(sub => {
      const matchedCategory = defaultCategories.find(c => c.id === sub.category);
      
      return {
        id: sub.id,
        description: sub.description,
        amount: sub.amount,
        recurringInterval: sub.recurringInterval,
        category: matchedCategory ? {
          name: matchedCategory.name || matchedCategory.label,
          icon: matchedCategory.icon,
          color: matchedCategory.color
        } : {
          name: sub.category || 'Other',
          icon: 'Receipt',
          color: '#9ca3af' 
        }
      };
    });

    return NextResponse.json({ 
      subscriptions: enrichedSubscriptions 
    }, { status: 200 });

  } catch (error) {
    console.error("MOBILE SUBSCRIPTIONS ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req) {
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Subscription ID is required" }, { status: 400 });
    }

    await db.transaction.update({
      where: { 
        id,
        userId: payload.userId 
      },
      data: { 
        isRecurring: false,
        recurringInterval: null 
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE SUBSCRIPTION ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}