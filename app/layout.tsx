import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "WeekendWise",
  description: "Find the best weather window for your outdoor plans.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col">
        <div className="flex-1">{children}</div>
        <footer className="mt-94 bg-off-black px-22 py-50 text-center">
          <p className="text-[12px] text-pure-white">
            WeekendWise — deterministic weather-window scoring on Open-Meteo data
          </p>
        </footer>
      </body>
    </html>
  );
}
