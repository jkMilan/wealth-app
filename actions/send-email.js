import { Resend } from "resend";
import { render } from "@react-email/components";

export async function sendEmail({to, subject, react}) {
    const resend = new Resend(process.env.RESEND_API_KEY || "");
    
    try {
        // 1. Manually compile the React template to HTML
        const html = await render(react);
        
        const data = await resend.emails.send({
            from: "Wealth App <onboarding@resend.dev>",
            to,
            subject,
            html: html, // 2. Pass the HTML string instead of the React object
        });
        
        return { success: true, data };
    } catch (error) {
        console.error("Failed to send email:", error);
        return { success: false, error };
    }
}