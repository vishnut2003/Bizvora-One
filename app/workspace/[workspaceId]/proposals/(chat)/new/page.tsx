import type { Metadata } from "next";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import ChatWorkspace from "../../_components/chat-workspace";

export const metadata: Metadata = {
  title: "New proposal — BizvoraOne",
};

type Props = {
  params: Promise<{ workspaceId: string }>;
};

export default async function NewProposalChatPage({ params }: Props) {
  const { workspaceId } = await params;

  const { session, workspace: doc } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: ["owner", "admin", "sales_manager", "sales_executive"],
  });

  const userInitial =
    (session.user.name ?? session.user.email ?? "you")
      .trim()
      .charAt(0)
      .toUpperCase() || "?";

  return (
    <ChatWorkspace
      key="new"
      workspaceId={String(doc._id)}
      workspaceName={doc.name}
      userImage={session.user.image ?? null}
      userInitial={userInitial}
      initialChat={null}
    />
  );
}
