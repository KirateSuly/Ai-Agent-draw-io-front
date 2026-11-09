import type { ChatResponse, ChatResponseType } from "@/src/types/api";
import { extractDrawioXml } from "@/src/utils/drawio";

export interface NormalizedChatResponse {
  type: ChatResponseType;
  content: string;
  diagramXml: string | null;
}

interface RawPayload {
  type?: unknown;
  content?: unknown;
  user?: unknown;
  drawio?: unknown;
}

/**
 * 兼容模型/后端把契约 JSON 当成普通文本返回的情况：
 * 例如 ```json {"type":"drawio","content":"<mxGraphModel...>"} ```
 */
function parseJsonPayload(text: string): RawPayload | null {
  let candidate = text.trim();
  if (!candidate) {
    return null;
  }

  const fenced = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    candidate = fenced[1].trim();
  }

  if (!candidate.startsWith("{") || !candidate.endsWith("}")) {
    return null;
  }

  try {
    const parsed = JSON.parse(candidate);
    return parsed && typeof parsed === "object" ? (parsed as RawPayload) : null;
  } catch {
    return null;
  }
}

/**
 * 把接口返回统一成前端可直接消费的结构。
 * 正常契约是 { type, content }；同时兼容 { user, drawio } 和原始 JSON 文本。
 */
export function normalizeChatResponse(
  response: ChatResponse | null | undefined,
): NormalizedChatResponse {
  let type: ChatResponseType =
    String(response?.type ?? "").toLowerCase() === "drawio" ? "drawio" : "user";
  let content = typeof response?.content === "string" ? response.content : "";
  let explicitType = Boolean(response?.type);

  // 兼容 user/drawio 双字段形式
  const directDrawio = typeof response?.drawio === "string" ? response.drawio : "";
  const directUser = typeof response?.user === "string" ? response.user : "";
  if (directDrawio.trim()) {
    type = "drawio";
    content = directDrawio;
    explicitType = true;
  } else if (directUser.trim()) {
    type = "user";
    content = directUser;
    explicitType = true;
  }

  // 兼容后端未解析契约 JSON、把原始 JSON 文本放进 content 的情况
  const wrapped = parseJsonPayload(content);
  if (wrapped) {
    const wrappedDrawio =
      typeof wrapped.drawio === "string" ? wrapped.drawio : "";
    const wrappedUser = typeof wrapped.user === "string" ? wrapped.user : "";

    if (wrappedDrawio.trim()) {
      type = "drawio";
      content = wrappedDrawio;
      explicitType = true;
    } else if (typeof wrapped.type === "string") {
      type = wrapped.type.toLowerCase() === "drawio" ? "drawio" : "user";
      if (typeof wrapped.content === "string") {
        content = wrapped.content;
      }
      explicitType = true;
    } else if (wrappedUser.trim()) {
      type = "user";
      content = wrappedUser;
      explicitType = true;
    } else if (typeof wrapped.content === "string") {
      content = wrapped.content;
    }
  }

  let diagramXml = type === "drawio" ? extractDrawioXml(content) : null;

  // 兼容旧后端：没有 type 字段但内容就是 XML
  if (!explicitType && !diagramXml) {
    const fallbackXml = extractDrawioXml(content);
    if (fallbackXml) {
      type = "drawio";
      diagramXml = fallbackXml;
    }
  }

  return {
    type,
    content: content.trim(),
    diagramXml,
  };
}
