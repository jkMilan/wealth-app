import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getFinancialProfile } from '@/actions/ml-insights';

export async function POST(req) {
  console.log("1. Chat API reached!"); 
  const { prompt } = await req.json();
  
  const { userId } = await auth();
  if (!userId) {
    console.log("ERROR: No user ID found.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("2. User authorized. Fetching ML Insights...");
    const insights = await getFinancialProfile();
    
    let contextString = "The user currently has no transaction history recorded.";
    if (insights) {
      contextString = `
        Financial Personality: ${insights.profile}
        Current Savings Rate: ${insights.savingsRate}%
        Predicted Cash Flow Next Month: Rs. ${insights.prediction.predicted_next_month_flow}
      `;
    }

    const systemPrompt = `You are WELTH... (keep your existing prompt text here)
    USER'S LIVE FINANCIAL DATA:
    ${contextString}
    
    USER QUESTION: 
    "${prompt}"
    
    YOUR ADVICE:`;

    console.log("4. Context built successfully. Sending to Ollama...");
    
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3', 
        prompt: systemPrompt,
        stream: false
      })
    });

    console.log("5. Received response from Ollama. Status:", response.status);
    
    const data = await response.json();
    return NextResponse.json({ response: data.response });

  } catch (error) {
    console.error("6. FATAL Chat API Error:", error);
    return NextResponse.json({ 
      error: 'Failed to generate advice. Ensure your local Ollama and Python ML servers are running.' 
    }, { status: 500 });
  }
}