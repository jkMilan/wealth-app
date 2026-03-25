import React, { Suspense } from 'react'
import CreateAccountDrawer from "@/components/create-account-drawer";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from 'lucide-react';
import { getUserAccounts, getDashboardData } from '@/actions/dashboard';
import AccountCard from './_components/account-card';
import { getCurrentBudget } from '@/actions/budget';
import BudgetProgress from './_components/budget-progress';
import DashboardOverview from './_components/transaction-overview';
import HistoricalTrends from './_components/historical-trends';
import ExportButton from '@/components/export-button';

async function DashboardPage() {
  const accounts = await getUserAccounts();
  const defaultAccount = accounts?.find((account) => account.isDefault);

  let budgetData = null;
  if(defaultAccount){
    budgetData = await getCurrentBudget(defaultAccount.id);
  }

  const transactions = await getDashboardData();

  const defaultAccountTransactions = transactions?.filter(
    (t) => t.accountId === defaultAccount?.id
  ) || [];

  return (
    <div className="space-y-8">
      
      {/* Account Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CreateAccountDrawer>
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed">
            <CardContent className="flex flex-col items-center justify-center text-muted-foreground h-full pt-5">
              <Plus className="h-10 w-10 mb-2" />
              <p className="text-sm font-medium">Add new account</p>
            </CardContent>
          </Card>
        </CreateAccountDrawer>

        {accounts.length > 0 &&
          accounts?.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
      </div>

      {/* Budget Progress */}
      {defaultAccount && (
        <BudgetProgress 
          initialBudget={budgetData?.budget}
          currentExpanses={budgetData?.currentExpanses || 0}
          accountId={defaultAccount.id}
        />
      )}

      {/* Overview */}
      <Suspense fallback={"Loading..."}>
        <DashboardOverview
          accounts={accounts}
          transactions={transactions || []}
        />
      </Suspense>

      <HistoricalTrends transactions={defaultAccountTransactions} />

    </div>
  );
}

export default DashboardPage;