import React from 'react';
import { getUserAccounts } from '@/actions/dashboard';
import { getTransaction } from '@/actions/transaction';
import AddTransactionForm from '@/app/(main)/transactions/_components/transaction-form';
import { defaultCategories } from '@/data/categories';


const AddTransactionPage = async ({ searchParams }) => {
    const accounts = await getUserAccounts();

    const editId = searchParams?.edit;

    let initialData = null;
    if (editId) {
        const transaction = await getTransaction(editId);
        initialData = transaction;
    }

    return (
        <div className="max-w-3xl mx-auto px-5">
            <h1 className="text-5xl gradient-title mb-8">Edit Transaction</h1>
            <AddTransactionForm
                accounts={accounts}
                categories={defaultCategories}
                editMode={!!editId}
                initialData={initialData}
            />
        </div>
    );
};

export default AddTransactionPage;
