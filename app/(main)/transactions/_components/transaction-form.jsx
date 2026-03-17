"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { transactionSchema } from '@/app/lib/schema';
import { zodResolver } from "@hookform/resolvers/zod"
import useFetch from '@/hooks/use-fetch';
import { createTransaction, updateTransaction } from '@/actions/transaction';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CreateAccountDrawer from '@/components/create-account-drawer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { useRouter, useSearchParams } from 'next/navigation';
import ReceiptScanner from './receipt-scanner';
import { toast } from "sonner";


const AddTransactionForm = ({ accounts, categories, editMode = false, initialData = null }) => {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const searchParams = useSearchParams();
    const editId = searchParams.get("edit");

    useEffect(() => {
        setMounted(true);
    }, []);

    const { register, handleSubmit, formState: { errors }, setValue, watch, reset, getValues } = useForm({
        resolver: zodResolver(transactionSchema),
        defaultValues: editMode && initialData ? {
            type: initialData.type,
            amount: initialData.amount.toString(),
            description: initialData.description,
            accountId: initialData.accountId,
            category: initialData.category,
            date: new Date(initialData.date),
            isRecurring: initialData.isRecurring,
            ...(initialData.recurringInterval && { recurringInterval: initialData.recurringInterval }),
        } : {
            type: "EXPENSE",
            amount: "",
            description: "",
            accountId: accounts.find((ac) => ac.isDefault)?.id,
            date: new Date(),
            isRecurring: false,
        },
    });

    const {
        loading: transactionLoading,
        fn: transactionFn,
        data: transactionResult,
    } = useFetch(editMode ? updateTransaction : createTransaction);

    const type = watch("type");
    const isRecurring = watch("isRecurring");
    const date = watch("date");
    const category = watch("category");
    const accountId = watch("accountId");

    const onSubmit = async (data) => {
        const fromData = {
            ...data,
            amount: parseFloat(data.amount),
        };

        if (editMode) {
            transactionFn(editId, fromData);
        } else {
            transactionFn(fromData);
        }
    };

    useEffect(() => {
        if (transactionResult?.success && !transactionLoading) {
            toast.success(editMode ? "Transaction updated successfully" : "Transaction created successfully");
            reset();
            router.push(`/account/${transactionResult.data.accountId}`);
        }
    }, [transactionResult, transactionLoading, editMode]);

    const filterdCategories = categories.filter(
        (category) => category.type === type
    );

    const handleScanComplete = (scannedData) => {
        if (scannedData) {
            if (scannedData.amount !== undefined) setValue("amount", scannedData.amount.toString());
            if (scannedData.date) setValue("date", new Date(scannedData.date));
            if (scannedData.description) setValue("description", scannedData.description);
            
            if (scannedData.category) {
                // Find matching category by name, ignoring case
                const matchedCategory = categories.find(
                    (c) => c.name.toLowerCase() === scannedData.category.toLowerCase() || 
                           c.id === scannedData.category
                );
                
                if (matchedCategory) {
                    setValue("category", matchedCategory.id);
                }
            }
            
            toast.success("Receipt scanned successfully");
        }
    };

    if (!mounted) return null;

    return <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {/* AI Recipt Scanner */}
        {!editMode && <ReceiptScanner onScanComplete={handleScanComplete} />}

        <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Select
                onValueChange={(value) => setValue("type", value)}
                defaultValue={type}
            >
                <SelectTrigger>
                    <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                    <SelectItem value="INCOME">Income</SelectItem>
                </SelectContent>
            </Select>
            {errors.type && (
                <p className="text-red-500 text-sm">{errors.type.message}</p>
            )}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
                <label className="text-sm font-medium">Amount</label>
                <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register("amount")}
                />

                {errors.amount && (
                    <p className="text-red-500 text-sm">{errors.amount.message}</p>
                )}
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Account</label>
                <Select
                    onValueChange={(value) => setValue("accountId", value)}
                    defaultValue={getValues("accountId")}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select Account" />
                    </SelectTrigger>
                    <SelectContent>
                        {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                                {account.name} (LKR {parseFloat(account.balance).toFixed(2)})
                            </SelectItem>
                        ))}
                        <CreateAccountDrawer>
                            <Button variant="ghost" className="w-full select-none item-center text-sm outline-none">Create Account</Button>
                        </CreateAccountDrawer>
                    </SelectContent>
                </Select>
                {errors.accountId && (
                    <p className="text-red-500 text-sm">{errors.accountId.message}</p>
                )}
            </div>
        </div>
        <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select
                onValueChange={(value) => setValue("category", value)}
                value={category}
            >
                <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                    {filterdCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {errors.category && (
                <p className="text-red-500 text-sm">{errors.category.message}</p>
            )}
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium">Date</label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className="w-full pl-3 text-left font-normal"
                    >
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(date) => setValue("date", date)}
                        disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                    />
                </PopoverContent>
            </Popover>

            {errors.date && (
                <p className="text-red-500 text-sm">{errors.date.message}</p>
            )}
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input placeholder="Enter Description" {...register("description")} />
            {errors.description && (
                <p className="text-red-500 text-sm">{errors.description.message}</p>
            )}
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
                <label htmlFor="isDefault"
                    className="text-sm font-medium cursor-pointer"
                >
                    Recurring Transaction
                </label>

                <p className="text-muted-foreground text-xs">
                    Set up a recurring schedule for this transaction
                </p>
            </div>
            <Switch
                checked={isRecurring}
                onCheckedChange={(checked) => setValue("isRecurring", checked)}
            />
        </div>

        {isRecurring && (
            <div className="space-y-2">
                <label className="text-sm font-medium">Recurring Interval</label>
                <Select
                    onValueChange={(value) => setValue("recurringInterval", value)}
                    defaultValue={getValues("recurringInterval")}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select Interval" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="DAILY">Daily</SelectItem>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="YEARLY">Yearly</SelectItem>
                    </SelectContent>
                </Select>
                {errors.recurringInterval && (
                    <p className="text-red-500 text-sm">
                        {errors.recurringInterval.message}
                    </p>
                )}
            </div>
        )}

        <div className="flex gap-4">
            <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.back()}
            >
                Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={transactionLoading}>
                {transactionLoading ? (
                    <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editMode ? "Updating..." : "Creating..."}
                    </>
                ) : editMode ? ( 
                    "Update Transaction"
                ) : ( 
                    "Create Transaction"
                )}
            </Button>
        </div>
    </form>
};

export default AddTransactionForm;