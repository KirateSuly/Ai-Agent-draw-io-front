import { API_CONFIG } from "@/src/config/api-config";
import type {
  ConversationBookmark,
  ConversationMessage,
  ConversationStore,
} from "@/src/types/conversation";

const STORE_VERSION = 1;
const MAX_TITLE_LENGTH = 24;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function conversationStorageKey(userId: string): string {
  return `${API_CONFIG.storageKeys.conversations}.${encodeURIComponent(
    userId.trim(),
  )}`;
}

function createConversationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `conversation-${crypto.randomUUID()}`;
  }
  return `conversation-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 新建一个空白对话书签 */
export function createBlankConversation(agentId = ""): ConversationBookmark {
  const now = Date.now();
  return {
    id: createConversationId(),
    title: "新对话",
    isTitleCustom: false,
    agentId,
    sessionId: null,
    messages: [],
    diagramXml: "",
    createdAt: now,
    updatedAt: now,
  };
}

/** 用首条用户消息生成书签标题 */
export function deriveConversationTitle(
  messages: ConversationMessage[],
  fallback = "新对话",
): string {
  const firstUserMessage = messages.find(
    (message) => message.role === "user" && message.content.trim(),
  );
  if (!firstUserMessage) {
    return fallback;
  }

  const normalized = firstUserMessage.content.replace(/\s+/g, " ").trim();
  return normalized.length > MAX_TITLE_LENGTH
    ? `${normalized.slice(0, MAX_TITLE_LENGTH)}…`
    : normalized;
}

export function sortConversationsByUpdatedAt(
  conversations: ConversationBookmark[],
): ConversationBookmark[] {
  return [...conversations].sort((left, right) => right.updatedAt - left.updatedAt);
}

function normalizeMessage(
  value: unknown,
  index: number,
): ConversationMessage | null {
  if (!isRecord(value)) {
    return null;
  }

  const role = value.role === "user" || value.role === "agent"
    ? value.role
    : null;
  const content = typeof value.content === "string" ? value.content : null;

  if (!role || content === null) {
    return null;
  }

  return {
    id:
      typeof value.id === "string" && value.id.trim()
        ? value.id
        : `legacy-message-${index}`,
    role,
    content,
    status: value.status === "error" ? "error" : undefined,
    diagramXml:
      typeof value.diagramXml === "string" ? value.diagramXml : undefined,
    retryText:
      typeof value.retryText === "string" ? value.retryText : undefined,
    needsInput: value.needsInput === true ? true : undefined,
  };
}

function normalizeConversation(value: unknown): ConversationBookmark | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === "string" ? value.id.trim() : "";
  if (!id) {
    return null;
  }

  const messages = Array.isArray(value.messages)
    ? value.messages
        .map((message, index) => normalizeMessage(message, index))
        .filter((message): message is ConversationMessage => message !== null)
    : [];

  const now = Date.now();
  const createdAt =
    typeof value.createdAt === "number" && Number.isFinite(value.createdAt)
      ? value.createdAt
      : now;
  const updatedAt =
    typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt)
      ? value.updatedAt
      : createdAt;
  const customTitle =
    typeof value.title === "string" ? value.title.trim() : "";
  const isTitleCustom = value.isTitleCustom === true && Boolean(customTitle);

  return {
    id,
    title: isTitleCustom
      ? customTitle
      : deriveConversationTitle(messages),
    isTitleCustom,
    agentId: typeof value.agentId === "string" ? value.agentId : "",
    sessionId: typeof value.sessionId === "string" ? value.sessionId : null,
    messages,
    diagramXml: typeof value.diagramXml === "string" ? value.diagramXml : "",
    createdAt,
    updatedAt,
  };
}

function emptyStore(): ConversationStore {
  return {
    version: STORE_VERSION,
    activeConversationId: null,
    conversations: [],
  };
}

/** 从浏览器读取当前用户的所有对话书签 */
export function loadConversationStore(userId: string): ConversationStore {
  if (typeof window === "undefined") {
    return emptyStore();
  }

  try {
    const raw = window.localStorage.getItem(conversationStorageKey(userId));
    if (!raw) {
      return emptyStore();
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || !Array.isArray(parsed.conversations)) {
      return emptyStore();
    }

    const conversations = parsed.conversations
      .map(normalizeConversation)
      .filter(
        (conversation): conversation is ConversationBookmark =>
          conversation !== null,
      );
    const sorted = sortConversationsByUpdatedAt(conversations);
    const activeConversationId =
      typeof parsed.activeConversationId === "string" &&
      sorted.some((conversation) => conversation.id === parsed.activeConversationId)
        ? parsed.activeConversationId
        : sorted[0]?.id ?? null;

    return {
      version: STORE_VERSION,
      activeConversationId,
      conversations: sorted,
    };
  } catch {
    return emptyStore();
  }
}

/** 保存完整书签数据；返回是否写入成功 */
export function saveConversationStore(
  userId: string,
  store: ConversationStore,
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(
      conversationStorageKey(userId),
      JSON.stringify(store),
    );
    return true;
  } catch (error) {
    console.warn("保存对话书签失败（可能是浏览器存储空间不足）", error);
    return false;
  }
}
