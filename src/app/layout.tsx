import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";

import { ConvexClientProvider } from "@/components/providers/convex-client-provider";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Onyx Management Dashboard",
  description: "Precision management and architectural oversight for the modern enterprise.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} dark h-full bg-black antialiased text-white`}
    >
      <body className="selection:bg-primary-fixed selection:text-on-primary-fixed flex min-h-full flex-col bg-black text-white">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
