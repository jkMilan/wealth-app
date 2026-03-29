"use server";

import { Resend } from "resend";
import { render } from "@react-email/components";

export async function sendEmail({to, subject, react}) {
    const resend = new Resend(process.env.RESEND_API_KEY || "");
    
    try {
        const html = await render(react);
        
        const data = await resend.emails.send({
            from: 'Wealth AI <onboarding@resend.dev>',
            to: ["milanjeya@icloud.com"],
            subject: subject,
            html: html,
        });
        
        return { success: true, data };
    } catch (error) {
        console.error("Failed to send email:", error);
        return { success: false, error };
    }
}