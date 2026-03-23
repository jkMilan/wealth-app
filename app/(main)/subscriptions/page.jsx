import { checkUser } from "@/lib/checkUser";
import { db } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, differenceInDays } from "date-fns";
import { CalendarClock, CreditCard, AlertCircle } from "lucide-react";

export default async function SubscriptionsPage() {
    // 1. Authenticate the user
    const user = await checkUser();
    if (!user) return <div>Unauthorized</div>;

    // 2. Fetch only the recurring transactions, sorted by the closest upcoming date
    const subscriptions = await db.transaction.findMany({
        where: {
            userId: user.id,
            isRecurring: true,
            type: "EXPENSE", // Assuming bills are expenses
        },
        orderBy: {
            nextRecurringDate: "asc",
        },
    });

    const today = new Date();

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Subscriptions & Bills</h1>
                <p className="text-muted-foreground mt-2">
                    Manage your recurring payments and see what's due next.
                </p>
            </div>

            {subscriptions.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-12 text-center">
                    <CalendarClock className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-medium">No active subscriptions</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        When you add a recurring expense, it will show up here.
                    </p>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {subscriptions.map((sub) => {
                        // Calculate how many days until the bill is due
                        const nextDate = new Date(sub.nextRecurringDate);
                        const daysUntilDue = differenceInDays(nextDate, today);
                        
                        // Determine urgency colors
                        const isUrgent = daysUntilDue <= 3 && daysUntilDue >= 0;
                        const isOverdue = daysUntilDue < 0;

                        return (
                            <Card key={sub.id} className={`relative overflow-hidden ${isUrgent ? 'border-orange-200 bg-orange-50/50' : ''}`}>
                                {/* Optional color strip on the left edge based on interval */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                    sub.recurringInterval === 'MONTHLY' ? 'bg-blue-500' : 
                                    sub.recurringInterval === 'YEARLY' ? 'bg-purple-500' : 'bg-gray-300'
                                }`} />
                                
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg font-semibold truncate pr-4">
                                            {sub.description || "Unnamed Bill"}
                                        </CardTitle>
                                        <CreditCard className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                    </div>
                                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                        {sub.recurringInterval}
                                    </p>
                                </CardHeader>
                                
                                <CardContent>
                                    <div className="mt-2 flex items-baseline gap-1">
                                        <span className="text-2xl font-bold">LKR {sub.amount.toNumber().toFixed(2)}</span>
                                    </div>

                                    <div className="mt-6 flex items-center gap-2 text-sm">
                                        {isOverdue ? (
                                            <div className="flex items-center text-red-600 font-medium">
                                                <AlertCircle className="h-4 w-4 mr-1" />
                                                Overdue
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center text-muted-foreground">
                                                    <CalendarClock className="h-4 w-4 mr-2" />
                                                    {format(nextDate, "MMM dd, yyyy")}
                                                </div>
                                                <span className={`font-medium ${isUrgent ? 'text-orange-600' : 'text-green-600'}`}>
                                                    {daysUntilDue === 0 ? "Due Today!" : `In ${daysUntilDue} days`}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}