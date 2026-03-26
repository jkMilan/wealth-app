import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Adjust this path if your Prisma client is exported from somewhere else
import jwt from 'jsonwebtoken';
import { defaultCategories } from '@/data/categories'; // Adjust this path to point to your categories file

export async function GET(request) {
  try {
    // 1. Authenticate the Mobile Request
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized missing token' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Handle different token payload structures (id vs userId)
    const userId = decoded.id || decoded.userId || decoded.sub;

    // 2. Fetch all recurring transactions for this user from the database
    const recurringTransactions = await prisma.transaction.findMany({
      where: {
        userId: userId,
        isRecurring: true, // Only fetch transactions marked as recurring
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 3. Enrich the data with your official category colors and icons!
    const enrichedSubscriptions = recurringTransactions.map(sub => {
      // Find the matching category in your Next.js data folder
      const matchedCategory = defaultCategories.find(c => c.id === sub.category);
      
      return {
        id: sub.id,
        description: sub.description,
        amount: sub.amount,
        recurringInterval: sub.recurringInterval,
        // If it finds the category, attach the color/icon. Otherwise, provide a fallback.
        category: matchedCategory ? {
          name: matchedCategory.name || matchedCategory.label,
          icon: matchedCategory.icon,
          color: matchedCategory.color
        } : {
          name: sub.category || 'Other',
          icon: 'Receipt',
          color: '#9ca3af' // fallback gray
        }
      };
    });

    return NextResponse.json({ subscriptions: enrichedSubscriptions }, { status: 200 });

  } catch (error) {
    console.error('Subscriptions API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}