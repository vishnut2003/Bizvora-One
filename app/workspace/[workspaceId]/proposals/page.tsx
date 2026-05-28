import type { Metadata } from "next";
import type { WorkspaceColor } from "@/lib/workspace";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import DashboardLayout from "@/layouts/dashboard-layout";
import ProposalChat from "@/models/proposal-chat";
import { serializeChat, type ChatDocLike } from "./_lib/serialize";
import ChatList from "./_components/chat-list";

export const metadata: Metadata = {
  title: "Proposals — BizvoraOne",
};

type ProposalsPageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function ProposalsPage({ params }: ProposalsPageProps) {
  const { workspaceId } = await params;

  const { session, workspace: doc, role } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: ["owner", "admin", "sales_manager", "sales_executive"],
  });

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role,
  };

  const chats = (await ProposalChat.find({
    workspace: workspaceId,
    createdBy: session.user.id,
  })
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean()) as unknown as ChatDocLike[];

  const conversations = chats.map(serializeChat);

  return (
    <DashboardLayout
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      workspace={workspace}
    >
      <ChatList workspaceId={workspace.id} conversations={conversations} />
    </DashboardLayout>
  );
}
