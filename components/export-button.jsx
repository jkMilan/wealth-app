"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, TableProperties } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import jsPDF from "jspdf";
import "jspdf-autotable";

const ExportButton = ({ transactions, accountName = "Account" }) => {
    // --- CSV EXPORT LOGIC ---
    const handleExportCSV = () => {
        if (!transactions || transactions.length === 0) {
            alert("No transactions to export!");
            return;
        }

        const headers = ["Date", "Description", "Category", "Type", "Amount (LKR)", "Status"];
        const csvRows = transactions.map((t) => {
            return [
                format(new Date(t.date), "yyyy-MM-dd"),
                `"${t.description || "Untitled"}"`,
                t.category || "Uncategorized",
                t.type,
                t.amount,
                t.status || "COMPLETED"
            ].join(",");
        });

        const csvContent = [headers.join(","), ...csvRows].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        
        const dateString = format(new Date(), "yyyy-MM-dd");
        link.setAttribute("href", url);
        link.setAttribute("download", `WealthAI_${accountName.replace(/\s+/g, '_')}_${dateString}.csv`);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- PDF EXPORT LOGIC ---
    const handleExportPDF = () => {
        if (!transactions || transactions.length === 0) {
            alert("No transactions to export!");
            return;
        }

        const doc = new jsPDF();
        const dateString = format(new Date(), "yyyy-MM-dd");

        // Add Header text
        doc.setFontSize(18);
        doc.text(`Wealth AI - Statement`, 14, 22);
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Account: ${accountName}`, 14, 30);
        doc.text(`Generated: ${dateString}`, 14, 36);

        // Define Table Columns and Rows
        const tableColumn = ["Date", "Description", "Category", "Type", "Amount (LKR)"];
        const tableRows = [];

        transactions.forEach(t => {
            const transactionData = [
                format(new Date(t.date), "yyyy-MM-dd"),
                t.description || "Untitled",
                t.category || "Uncategorized",
                t.type,
                parseFloat(t.amount).toFixed(2), // Ensure decimals look clean
            ];
            tableRows.push(transactionData);
        });

        // Generate the auto-table
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [63, 81, 181] }, // A nice blue header
            alternateRowStyles: { fillColor: [245, 247, 250] } // Light gray alternating rows
        });

        // Save the PDF
        doc.save(`WealthAI_${accountName.replace(/\s+/g, '_')}_${dateString}.pdf`);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
                    <TableProperties className="mr-2 h-4 w-4 text-green-600" />
                    <span>Export as CSV (Excel)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                    <FileText className="mr-2 h-4 w-4 text-red-600" />
                    <span>Export as PDF</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default ExportButton;