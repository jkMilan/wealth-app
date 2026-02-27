import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define the routes that REQUIRE a login
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/account(.*)",
  "/transaction(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Use await auth() for Clerk v6+ compatibility
  // auth.protect() is the "standard" way to handle redirects safely
  if (isProtectedRoute(req)) {
    await auth.protect(); 
  }
});

export const config = {
  matcher: [
    // Optimized matcher to ignore static files and Next.js internals
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};