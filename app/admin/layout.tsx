import type { Metadata } from "next";
import AdminLayout from "@/layouts/admin-layout";
import { requirePlatformAdmin } from "@/lib/platform-admin";

export const metadata: Metadata = {
  title: "Admin — BizvoraOne",
};

export default async function AdminRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = await requirePlatformAdmin();

  return (
    <AdminLayout
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
    >
      {children}
    </AdminLayout>
  );
}
