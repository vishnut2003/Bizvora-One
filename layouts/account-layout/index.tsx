import type { ReactNode } from "react";
import Header from "./header";
import Sidebar from "./sidebar";
import MobileTabs from "./mobile-tabs";

type AccountLayoutProps = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  children: ReactNode;
};

export default function AccountLayout({ user, children }: AccountLayoutProps) {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <MobileTabs />
          <main className="flex flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
