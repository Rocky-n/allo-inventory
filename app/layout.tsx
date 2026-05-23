import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Package2 } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Allo | Premium Inventory",
  description: "High-concurrency reservation platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-slate-50 flex flex-col`}>
        {/* Global Navigation Bar */}
        <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="container mx-auto max-w-5xl flex h-16 items-center px-8">
            <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
                <Package2 className="w-5 h-5" />
              </div>
              Allo<span className="text-slate-400 font-normal">Store</span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1">
          {children}
        </main>
        
        {/* Simple Footer */}
        <footer className="border-t py-6 text-center text-sm text-slate-500 bg-white">
          <p>© {new Date().getFullYear()} Allo Engineering Exercise.</p>
        </footer>
        
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}