import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import { auth } from "@/config/auth";
import AuthSessionProvider from "@/providers/session-provider";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "WSS CRM — A workspace for every team",
  description:
    "Create your own workspace and run your customer relationships your way. Pipelines, contacts, deals, and automations — built for teams of any size.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${rubik.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
