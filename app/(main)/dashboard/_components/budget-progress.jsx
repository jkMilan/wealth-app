"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Pencil, Trash } from 'lucide-react';
import { useState, useEffect } from 'react';
import useFetch from '@/hooks/use-fetch';
import { updateBudget, deleteBudget } from '@/actions/budget';
import { toast } from 'sonner';

const BudgetProgress = ({ initialBudget, currentExpanses, accountId }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [newBudget, setNewBudget] = useState(
        initialBudget?.amount?.toString() || ""
    );

    const {
        loading: isLoading,
        fn: updateBudgetFn,
        data: updatedBudget,
        error,
    } = useFetch(updateBudget);

    const percentUsed = initialBudget
        ? (currentExpanses / initialBudget.amount) * 100
        : 0;

    const handleUpdateBudget = async () => {
        const amount = parseFloat(newBudget);

        if (isNaN(amount) || amount <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        await updateBudgetFn(accountId, amount);
    };

    useEffect(() => {
        if (updatedBudget?.success) {
            setIsEditing(false);
            toast.success("Budget updated successfully");
        }
    }, [updatedBudget]);

    const {
        loading: isDeleting,
        fn: deleteBudgetFn,
        data: deletedBudget,
        error: deleteError,
    } = useFetch(deleteBudget);

    useEffect(() => {
        if (error || deleteError) {
            toast.error(error?.message || deleteError?.message || "Failed to update budget");
        }
    }, [error, deleteError]);

    const handleCancel = () => {
        setNewBudget(initialBudget?.amount?.toString() || "");
        setIsEditing(false);
    };

    const handleResetBudget = async () => {
        if (window.confirm("Are you sure you want to reset and remove this budget?")) {
            await deleteBudgetFn(accountId);
            setIsEditing(false); 
            setNewBudget(""); 
            toast.success("Budget has been reset");
        }
    };

    return (
        <Card>
            {/* 1. HEADER: Title on the left, Buttons on the far right */}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm sm:text-base font-medium">Monthly Budget (Default Account)</CardTitle>

                {/* Only show these action buttons if we are NOT editing */}
                {!isEditing && (
                    <div className="flex items-center gap-2">
                        {/* Show Delete button only if a budget exists */}
                        {initialBudget && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                                onClick={handleResetBudget}
                                disabled={isDeleting}
                                title="Reset Budget"
                            >
                                <Trash className="h-4 w-4" />
                            </Button>
                        )}
                        
                        {/* Edit Button (Styled as outline to match the image perfectly) */}
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setIsEditing(true)}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </CardHeader>

            {/* 2. CONTENT: Input Box OR Progress Bar */}
            <CardContent>
                {isEditing ? (
                    // EDIT MODE
                    <div className="flex items-center gap-2 pt-2">
                        <Input
                            type="number"
                            value={newBudget}
                            onChange={(e) => setNewBudget(e.target.value)}
                            className="w-32"
                            placeholder="Enter amount"
                            autoFocus
                            disabled={isLoading}
                        />
                        <Button variant="ghost" size="icon" onClick={handleUpdateBudget} disabled={isLoading}>
                            <Check className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleCancel} disabled={isLoading}>
                            <X className="h-4 w-4 text-red-500" />
                        </Button>
                    </div>
                ) : (
                    // VIEW MODE
                    <div className="pt-2">
                        {initialBudget ? (
                            <div className="space-y-3">
                                {/* The text description sits right above the bar */}
                                <CardDescription className="text-sm font-medium">
                                    LKR {currentExpanses.toFixed(2)} of LKR {initialBudget.amount.toFixed(2)} spent
                                </CardDescription>
                                
                                <Progress 
                                    value={percentUsed} 
                                    className={
                                        percentUsed >= 90 
                                            ? "[&>div]:bg-red-500" 
                                            : percentUsed >= 80 
                                            ? "[&>div]:bg-yellow-500" 
                                            : "[&>div]:bg-green-500"
                                    }
                                />
                                <p className="text-xs text-muted-foreground text-right">
                                    {percentUsed.toFixed(1)}% used
                                </p>
                            </div>
                        ) : (
                            <CardDescription className="text-sm text-muted-foreground">
                                No budget set
                            </CardDescription>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default BudgetProgress;