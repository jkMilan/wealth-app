"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

const HistoricalTrends = ({ transactions }) => {
    const chartData = useMemo(() => {
        const today = new Date();
        const months = [];

        for (let i = 5; i >= 0; i--) {
            const date = subMonths(today, i);
            months.push({
                month: format(date, "MMM yyyy"), 
                startDate: startOfMonth(date),
                endDate: endOfMonth(date),
                income: 0,
                expense: 0,
            });
        }

        transactions.forEach((t) => {
            const transactionDate = new Date(t.date);
            
            const monthData = months.find((m) => 
                isWithinInterval(transactionDate, { start: m.startDate, end: m.endDate })
            );

            if (monthData) {
                const amount = typeof t.amount === 'number' ? t.amount : t.amount.toNumber();
                if (t.type === "INCOME") {
                    monthData.income += amount;
                } else if (t.type === "EXPENSE") {
                    monthData.expense += amount;
                }
            }
        });

        return months;
    }, [transactions]);

    return (
        <Card className="col-span-2">
            <CardHeader>
                <CardTitle className="text-base font-normal">Income vs. Expenses (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[350px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis 
                                dataKey="month" 
                                stroke="#888888" 
                                fontSize={12} 
                                tickLine={false} 
                                axisLine={false} 
                            />
                            <YAxis 
                                stroke="#888888" 
                                fontSize={12} 
                                tickLine={false} 
                                axisLine={false}
                                tickFormatter={(value) => `LKR ${value}`}
                            />
                            <Tooltip 
                                cursor={{ fill: '#f3f4f6' }}
                                formatter={(value) => `LKR ${value.toFixed(2)}`}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend iconType="circle" />
                            <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expense" name="Expenses" fill="#FF0000" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};

export default HistoricalTrends;