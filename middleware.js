import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware({
  publicRoutes: ["/login", "/register"], // these don’t require auth
});

export const config = {
  matcher: [
    // Protect everything except Next.js internals & static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always check API & trpc routes
    "/(api|trpc)(.*)",
  ],
};
