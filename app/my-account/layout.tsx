import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/config/auth";
import AccountLayout from "@/layouts/account-layout";

export const metadata: Metadata = {
  title: "My account — BizvoraOne",
};

export default async function MyAccountRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <AccountLayout
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
    >
      {children}
    </AccountLayout>
  );
}
