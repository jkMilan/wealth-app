"use client";

import { deleteAccount } from "@/actions/accounts";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DeleteAccountButton({ accountId }) {
    const router = useRouter();

    const {
        loading: deleteLoading,
        fn: deleteFn,
        data: deletedAccount,
        error: deleteError,
    } = useFetch(deleteAccount);

    const handleDelete = () => {
        if (window.confirm("Are you sure? This will delete the account and ALL its transactions forever!")) {
            deleteFn(accountId);
        }
    };

    useEffect(() => {
        if (deletedAccount?.success) {
            toast.success("Account deleted successfully!");
            router.push("/dashboard"); // Kick them back to the dashboard
        } else if (deleteError || deletedAccount?.error) {
            toast.error(deleteError?.message || deletedAccount?.error);
        }
    }, [deletedAccount, deleteError, router]);

    return (
        <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleDelete} 
            disabled={deleteLoading}
        >
            <Trash className="w-4 h-4 mr-2" />
            {deleteLoading ? "Deleting..." : "Delete Account"}
        </Button>
    );
}