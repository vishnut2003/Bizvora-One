import type { Metadata } from "next";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import ProposalChat from "@/models/proposal-chat";
import ChatWorkspace from "../../../_components/chat-workspace";
import {
  serializeChat,
  type ChatDocLike,
} from "../../../_lib/serialize";

export const metadata: Metadata = {
  title: "Proposal chat — BizvoraOne",
};

type Props = {
  params: Promise<{ workspaceId: string; chatId: string }>;
};

export default async function ProposalChatPage({ params }: Props) {
  const { workspaceId, chatId } = await params;

  if (!mongoose.Types.ObjectId.isValid(chatId)) notFound();

  const { session, workspace: doc } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: ["owner", "admin", "sales_manager", "sales_executive"],
  });

  const chatDoc = (await ProposalChat.findOne({
    _id: chatId,
    workspace: workspaceId,
    createdBy: session.user.id,
  }).lean()) as unknown as ChatDocLike | null;

  if (!chatDoc) notFound();

  const chat = serializeChat(chatDoc);

  const userInitial =
    (session.user.name ?? session.user.email ?? "you")
      .trim()
      .charAt(0)
      .toUpperCase() || "?";

  return (
    <ChatWorkspace
      key={chat.id}
      workspaceId={String(doc._id)}
      workspaceName={doc.name}
      userImage={session.user.image ?? null}
      userInitial={userInitial}
      initialChat={chat}
    />
  );
}
