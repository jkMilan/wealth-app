"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react"; 
import { format } from "date-fns";
import jsPDF from "jspdf";
import "jspdf-autotable";

const ExportPdfButton = ({ transactions, accountName }) => {
    const generatePDF = () => {
        if (!transactions || transactions.length === 0) {
            alert("No transactions to export!");
            return;
        }

        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.text(`Account Statement: ${accountName}`, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${format(new Date(), "PPP")}`, 14, 30);

        const tableColumn = ["Date", "Description", "Category", "Type", "Amount (LKR)"];
        const tableRows = [];

        transactions.forEach((t) => {
            const transactionData = [
                format(new Date(t.date), "yyyy-MM-dd"),
                t.description || "Untitled",
                t.category || "Uncategorized",
                t.type,
                Number(t.amount).toFixed(2), 
            ];
            tableRows.push(transactionData);
        });
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 40, 
            styles: { fontSize: 10, cellPadding: 3 },
            headStyles: { fillColor: [139, 92, 246] }, 
            alternateRowStyles: { fillColor: [248, 250, 252] }, 
        });

        const fileName = `WealthAI_${accountName.replace(/\s+/g, '_')}_Statement.pdf`;
        doc.save(fileName);
    };

    return (
        <Button onClick={generatePDF} className="flex items-center gap-2">
            <FileDown className="h-4 w-4" />
            Export PDF
        </Button>
    );
};

export default ExportPdfButton;