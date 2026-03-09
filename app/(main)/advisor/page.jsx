"use client";
import { useState } from 'react';
import { Bot, User, Send, Loader2 } from 'lucide-react';

export default function AdvisorPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hello! I am your WELTH AI Advisor. I have analyzed your recent transactions and spending habits. How can I help you today?" }
  ]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage })
      });
      const data = await res.json();
      
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: data.response || data.error 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "Error connecting to the WELTH Advisor network." }]);
    }
    
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Financial Coach</h1>
        <p className="text-muted-foreground mt-1">Ask questions about your budget and cash flow predictions.</p>
      </div>
      
      <div className="bg-white dark:bg-zinc-950 border rounded-xl flex flex-col h-[600px] shadow-sm">
        {/* Chat History Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-indigo-600" />
                </div>
              )}
              
              <div className={`p-4 rounded-2xl max-w-[80%] whitespace-pre-wrap text-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-gray-100 dark:bg-zinc-900 border dark:border-zinc-800 rounded-bl-none leading-relaxed'
              }`}>
                {msg.text}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="p-4 rounded-2xl bg-gray-100 dark:bg-zinc-900 border rounded-bl-none flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Analyzing your data...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t bg-gray-50/50 dark:bg-zinc-900/50 rounded-b-xl">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1 p-3 px-4 border rounded-full bg-white dark:bg-zinc-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="E.g., Can I afford to go out for dinner tonight?"
              disabled={loading}
            />
            <button 
              onClick={sendMessage} 
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}