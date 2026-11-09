export type ConversationMessageRole = "user" | "agent";

/** 持久化到浏览器的单条对话消息 */
export interface ConversationMessage {
  id: string;
  role: ConversationMessageRole;
  content: string;
  status?: "done" | "error";
  diagramXml?: string;
  retryText?: string;
  /** type=user 的回复：需要用户补充信息 */
  needsInput?: boolean;
}

/** 一个对话书签：对话内容 + 当前 draw.io 画布 */
export interface ConversationBookmark {
  id: string;
  title: string;
  /** 用户手动命名后，不再被首条消息自动覆盖 */
  isTitleCustom?: boolean;
  agentId: string;
  sessionId: string | null;
  messages: ConversationMessage[];
  /** 该对话对应的 draw.io 当前 XML */
  diagramXml: string;
  createdAt: number;
  updatedAt: number;
}

/** 浏览器中保存的完整书签数据 */
export interface ConversationStore {
  version: 1;
  activeConversationId: string | null;
  conversations: ConversationBookmark[];
}
