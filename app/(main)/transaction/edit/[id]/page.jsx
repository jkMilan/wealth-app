import React from 'react';
import { getUserAccounts } from '@/actions/dashboard';
import { getTransaction } from '@/actions/transaction';
import AddTransactionForm from '@/app/(main)/transactions/_components/transaction-from';
import { defaultCategories } from '@/data/categories';
import { notFound } from 'next/navigation';

export const metadata = {
    title: "Edit Transaction",
};

const EditTransactionPage = async ({ params }) => {
    const { id } = await params;
    const accounts = await getUserAccounts();
    const transaction = await getTransaction(id);

    if (!transaction) {
        return notFound();
    }

    return (
        <div className="max-w-3xl mx-auto px-5">
            <h1 className="text-5xl gradient-title mb-8">Edit Transaction</h1>
            <AddTransactionForm
                accounts={accounts}
                categories={defaultCategories}
                editMode={true}
                initialData={transaction}
            />
        </div>
    );
};

export default EditTransactionPage;
