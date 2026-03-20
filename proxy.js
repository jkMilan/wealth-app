import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import arcjet, { shield, detectBot, createMiddleware } from '@arcjet/next';


const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/account(.*)",
  "/transaction(.*)",
]);

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

const clerk = clerkMiddleware(async (auth, req) => {
  const {userId} = await auth();

  if (!userId && isProtectedRoute(req)) {
    const {redirectToSignIn} = await auth();
    
    return redirectToSignIn();
  }

  if (isProtectedRoute(req)) {
    await auth.protect(); 
  }
});

export default createMiddleware(aj, clerk);

export const config = {
  matcher: [
    // Optimized matcher to ignore static files and Next.js internals
    "/((?!_next|api/ingest/sms|api/cron|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api(?!/ingest/sms|/cron)|trpc)(.*)",
  ],
};