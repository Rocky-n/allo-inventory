import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"; // Add this import

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Allo Inventory",
  description: "Take-home exercise",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster /> {/* Add this component */}
      </body>
    </html>
  );
}