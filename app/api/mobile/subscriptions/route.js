import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { decrypt } from "@/lib/auth";
import { defaultCategories } from "@/data/categories"; // Adjust this path if needed

export async function GET(req) {
  try {
    // 1. Authentication (Perfectly matching your dashboard logic!)
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

    // 2. Fetch all recurring transactions for this user
    const recurringTransactions = await db.transaction.findMany({
      where: { 
        userId: userId,
        isRecurring: true // Only fetch the subscriptions!
      },
      orderBy: { 
        createdAt: "desc" 
      },
    });

    // 3. Attach the beautiful UI colors and icons to send to the mobile app
    const enrichedSubscriptions = recurringTransactions.map(sub => {
      // Match the database category ID to your frontend categories.js file
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
          // Fallback if a category got deleted or modified
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