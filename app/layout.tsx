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
          color="#8e51ff"
          height={2}
          shadow="0 0 10px #8e51ff, 0 0 5px #8e51ff"
          showSpinner={false}
        />
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
