"use client";

import React from "react";
import { Bar, BarChart, CartesianGrid, Label, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useState, useMemo } from "react";
import { startOfDay, endOfDay, subDays, format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DATE_RANGES = {
    "7D": { Label: "Last 7 Days", days: 7 },
    "1M": { Label: "Last 1 Month", days: 30 },
    "3M": { Label: "Last 3 Months", days: 90 },
    "6M": { Label: "Last 6 Months", days: 180 },
    ALL: { Label: "All Time", days: null },
};

const AccountChart = ({ transactions }) => {
    const [dateRange, setDateRange] = useState("1M");

    const filteredData = useMemo(() => {
        const range = DATE_RANGES[dateRange];
        const now = new Date();
        const startDate = range.days
            ? startOfDay(subDays(now, range.days))
            : startOfDay(new Date(0));

        // Filter transactions within the date range
        const filtered = transactions.filter(
            (t) => new Date(t.date) >= startDate && new Date(t.date) <= endOfDay(now)
        );

        // Group transactions by day
        const grouped = filtered.reduce((acc, transaction) => {
            const date = format(transaction.date, "MMM dd");

            if (!acc[date]) {
                acc[date] = { date, income: 0, expense: 0 };
            }

            if (transaction.type === "INCOME") {
                acc[date].income += transaction.amount;
            } else {
                acc[date].expense += transaction.amount;
            }

            return acc;
        }, {});

        // Convert to array and sort by date 
        return Object.values(grouped).sort(
            (a, b) => new Date(a.date) - new Date(b.date)
        );
    }, [transactions, dateRange]);

    const totals = useMemo(() => {
        return filteredData.reduce(
            (acc, day) => ({
                income: acc.income + day.income,
                expense: acc.expense + day.expense,
            }),
            { income: 0, expense: 0 }
        );
    }, [filteredData]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                <CardTitle className="text-base font-normal">
                    Transactions Overview
                </CardTitle>
                <Select defaultValue={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(DATE_RANGES).map(([key, { Label }]) => (
                            <SelectItem key={key} value={key}>
                                {Label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
                <div className="flex justify-around mb-6 text-sm">
                    <div className="text-center">
                        <p className="text-muted-foreground">Total Income</p>
                        <p className="text-lg font-bold text-green-500">
                            LKR {totals.income.toFixed(2)}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-muted-foreground">Total Expense</p>
                        <p className="text-lg font-bold text-red-500">
                            LKR {totals.expense.toFixed(2)}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-muted-foreground">Total Balance</p>
                        <p
                            className={`text-lg font-bold ${totals.income - totals.expense > 0
                                    ? "text-green-500"
                                    : "text-red-500"
                                }`}
                        >
                            LKR {(totals.income - totals.expense).toFixed(2)}
                        </p>
                    </div>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart
                            data={filteredData}
                            margin={{
                                top: 10,
                                right: 10,
                                left: 10,
                                bottom: 0,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormat={(value) => `LKR ${value}`}
                            />
                            <Tooltip formatter={(value) => [`LKR ${value}`, undefined]} />
                            <Legend />
                            <Bar dataKey="income" name="Income" fill="#8884d8" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expense" name="Expense" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};

export default AccountChart;