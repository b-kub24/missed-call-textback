import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "InstantReply - Missed Call Text-Back Automation",
  description:
    "Never lose a lead again. Automatically text back missed callers within 5 seconds with a friendly message and booking link.",
  keywords: [
    "missed call text back",
    "sms automation",
    "lead capture",
    "small business",
    "twilio",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
