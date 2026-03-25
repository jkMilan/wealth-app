import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
  Button
} from "@react-email/components";
import * as React from "react";

const PREVIEW_DATA = {
  monthlyReport: {
    userName: "Milan",
    type: "monthly-report",
    data: { month: "March", stats: { totalIncome: 50000, totalExpenses: 30000, byCategory: { Food: 15000, Transport: 5000 } }, insights: ["You saved 20% more this month!"] },
  },
  budgetAlert: {
    userName: "Milan",
    type: "budget-alert",
    data: { percentageUsed: 85, budgetAmount: 100000, totalExpenses: 85000 },
  },
};

export default function EmailTemplate({
  userName = "",
  type = "monthly-report",
  data = {},
}) {
  
  const EmailWrapper = ({ previewText, children }) => (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-slate-900 font-sans my-auto mx-auto px-2 py-10">
          <Container className="border border-solid border-[#eaeaea] rounded-xl my-[40px] mx-auto p-[30px] max-w-[500px] bg-white shadow-lg">
            
            {/* Logo */}
            <Section className="mt-2 mb-8 text-center">
              <Text className="text-blue-600 text-2xl font-bold m-0 tracking-tight">
                Wealth AI
              </Text>
            </Section>

            {children}

            {/* Disclaimer */}
            <Text className="text-gray-500 text-[13px] leading-[24px] text-center mt-8 pt-4 border-t border-gray-100">
              Thank you for using Wealth AI. Keep tracking your finances for better financial health!
            </Text>
          </Container>

          {/* Footer outside the card */}
          <Text className="text-slate-400 text-[12px] text-center mt-6">
            © 2026 Wealth AI. All rights reserved.
          </Text>
        </Body>
      </Tailwind>
    </Html>
  );

  if (type === "monthly-report") {
    return (
      <EmailWrapper previewText="Your Monthly Financial Report">
        <Text className="text-gray-800 text-[16px] leading-[24px] font-medium">Hello {userName},</Text>
        <Heading className="text-gray-900 text-[24px] font-bold text-center p-0 my-[24px] mx-0">
          Monthly Report: {data?.month}
        </Heading>

        {/* Main Stats */}
        <Section className="bg-gray-50 border border-gray-100 rounded-lg p-6 mb-6">
          <div className="mb-4">
            <Text className="text-gray-500 m-0 text-sm font-medium">Total Income</Text>
            <Text className="text-green-600 font-bold text-lg m-0">LKR {data?.stats?.totalIncome}</Text>
          </div>
          <div className="mb-4">
            <Text className="text-gray-500 m-0 text-sm font-medium">Total Expenses</Text>
            <Text className="text-red-600 font-bold text-lg m-0">LKR {data?.stats?.totalExpenses}</Text>
          </div>
          <div className="pt-4 border-t border-gray-200">
            <Text className="text-gray-900 m-0 text-sm font-bold">Net Balance</Text>
            <Text className="text-gray-900 font-bold text-xl m-0">
              LKR {(data?.stats?.totalIncome || 0) - (data?.stats?.totalExpenses || 0)}
            </Text>
          </div>
        </Section>

        {/* AI Insights */}
        {data?.insights && data.insights.length > 0 && (
          <Section className="bg-blue-50 border border-blue-100 rounded-lg p-6 mb-6">
            <Heading className="text-blue-900 text-[16px] font-bold m-0 mb-4">Wealth Insights</Heading>
            {data.insights.map((insight, index) => (
              <Text key={index} className="text-blue-800 text-[14px] m-0 mb-2">
                ✨ {insight}
              </Text>
            ))}
          </Section>
        )}
        
        <Section className="text-center mt-[32px] mb-[16px]">
          <Button className="bg-blue-600 rounded-lg text-white text-[14px] font-semibold no-underline text-center px-6 py-3" href="http://localhost:3000/dashboard">
            View Full Dashboard
          </Button>
        </Section>
      </EmailWrapper>
    );
  }

  if (type === "budget-alert") {
    return (
      <EmailWrapper previewText="Budget Alert">
        <Text className="text-gray-800 text-[16px] leading-[24px] font-medium">Hello {userName},</Text>
        <Heading className="text-gray-900 text-[24px] font-bold text-center p-0 my-[24px] mx-0">
          Budget Alert: {data?.accountName || "Your Account"}
        </Heading>
        
        <Section className="bg-red-50 border border-solid border-red-100 rounded-lg p-4 text-center mb-6">
          <Text className="m-0 text-red-900 font-medium text-[15px] flex items-center justify-center">
            ⚠️ You've used {data?.percentageUsed?.toFixed(1)}% of your monthly budget.
          </Text>
        </Section>

        <Section className="bg-gray-50 border border-gray-100 rounded-lg p-6 mb-6">
          <div className="mb-4">
            <Text className="text-gray-500 m-0 text-sm font-medium">Budget Amount</Text>
            <Text className="text-gray-900 font-bold text-lg m-0">LKR {data?.budgetAmount}</Text>
          </div>
          <div className="mb-4">
            <Text className="text-gray-500 m-0 text-sm font-medium">Spent So Far</Text>
            <Text className="text-red-600 font-bold text-lg m-0">LKR {data?.totalExpenses}</Text>
          </div>
          <div className="pt-4 border-t border-gray-200">
            <Text className="text-gray-900 m-0 text-sm font-bold">Remaining</Text>
            <Text className="text-green-600 font-bold text-xl m-0">
              LKR {(data?.budgetAmount || 0) - (data?.totalExpenses || 0)}
            </Text>
          </div>
        </Section>

        <Section className="text-center mt-[32px] mb-[16px]">
          <Button className="bg-blue-600 rounded-lg text-white text-[14px] font-semibold no-underline text-center px-6 py-3" href="http://localhost:3000/dashboard">
            Review Expenses
          </Button>
        </Section>
      </EmailWrapper>
    );
  }
}

EmailTemplate.PreviewProps = PREVIEW_DATA.budgetAlert;