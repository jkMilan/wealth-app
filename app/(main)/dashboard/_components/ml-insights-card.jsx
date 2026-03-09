import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, TrendingUp, TrendingDown } from "lucide-react";

export function MlInsightsCard({ insights }) {
  if (!insights) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-500">
            <BrainCircuit className="h-5 w-5" />
            AI Financial Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">Ensure the local Python ML service is running to view insights.</p>
        </CardContent>
      </Card>
    );
  }

  const isImproving = insights.prediction.trend === "Improving";

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-zinc-900 dark:to-zinc-950 border-indigo-100 dark:border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <BrainCircuit className="h-5 w-5" />
            Financial Personality
          </CardTitle>
          <Badge variant={insights.profile === 'Saver' ? 'default' : 'destructive'}>
            {insights.profile}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium leading-relaxed">
            {insights.advice}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Current Savings Rate: {insights.savingsRate}%
          </p>
        </div>

        <div className="pt-4 border-t border-indigo-50 dark:border-zinc-800">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            Next Month Forecast
            {isImproving ? <TrendingUp className="h-4 w-4 text-green-500"/> : <TrendingDown className="h-4 w-4 text-red-500"/>}
          </h4>
          <div className="flex justify-between items-end">
            <span className="text-2xl font-bold">
              Rs. {insights.prediction.predicted_next_month_flow}
            </span>
            <span className={`text-xs ${isImproving ? 'text-green-600' : 'text-red-600'}`}>
              Trend: {insights.prediction.trend}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {insights.prediction.confidence_note}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}