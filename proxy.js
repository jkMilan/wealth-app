import arcjet, { shield, detectBot, createMiddleware } from '@arcjet/next';
import { NextResponse } from "next/server";
import { decrypt } from "@/lib/auth";

const isProtectedRoute = (req) => {
  const pathname = req.nextUrl.pathname;
  return pathname.startsWith("/dashboard") || 
         pathname.startsWith("/account") || 
         pathname.startsWith("/transaction");
};

const aj = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    shield({
      mode: 'LIVE',
    }),
    detectBot({
      mode: 'LIVE',
      allow: ["CATEGORY:SEARCH_ENGINE","GO_HTTP"],
    }),
  ],
});

const authMiddleware = async (req) => {
  if (isProtectedRoute(req)) {
    const cookie = req.cookies.get("auth_token")?.value;
    const session = await decrypt(cookie);

    if (!session?.userId) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  }
  
  return NextResponse.next();
};

export default createMiddleware(aj, authMiddleware);

export const config = {
  matcher: [
    "/((?!_next|api/ingest/sms|api/cron|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api(?!/ingest/sms|/cron)|trpc)(.*)",
  ],
};