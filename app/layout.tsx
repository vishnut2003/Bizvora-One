import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import AuthSessionProvider from "@/providers/session-provider";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BizvoraOne — A workspace for every team",
  description:
    "Create your own workspace and run your customer relationships your way. Pipelines, contacts, deals, and automations — built for teams of any size.",
  verification: {
    google: "rEUkjioKQhHreBjVE1GeUJAKvTuCnKBsIAoc8B42b4A",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${rubik.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <NextTopLoader
          color="#8C00FF"
          height={2}
          shadow="0 0 10px #8C00FF, 0 0 5px #8C00FF"
          showSpinner={false}
        />
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
