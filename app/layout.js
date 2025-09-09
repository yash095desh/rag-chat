import { Roboto } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";


// Import Roboto with multiple weights
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"], 
  variable: "--font-roboto",
});

export const metadata = {
  title: "RAG Chat App",
  description:
    "A Retrieval-Augmented Generation chat application with authentication and personalized dashboards.",
  authors: [{ name: "Your Name" }],
  keywords: ["RAG", "Chatbot", "Next.js", "AI", "Clerk Auth"],
  openGraph: {
    title: "RAG Chat App",
    description:
      "Chat with your documents and URLs using AI-powered RAG system. Secure login with Clerk.",
    url: "https://your-app-domain.com",
    siteName: "RAG Chat App",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${roboto.className}`}>
          <ThemeProvider>
            {children}
          </ThemeProvider>
          <Toaster/>
        </body>
      </html>
    </ClerkProvider>
  );
}
