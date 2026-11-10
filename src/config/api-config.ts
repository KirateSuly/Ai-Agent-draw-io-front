/**
 * 前端接口配置
 * 通过 NEXT_PUBLIC_API_BASE_URL 指定后端地址；为空字符串表示与页面同源。
 */
const DEFAULT_API_BASE_URL = "http://122.51.85.195:8091";

export const API_CONFIG = {
  baseUrl: (process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(
    /\/+$/,
    "",
  ),
  prefix: "/api/v1",
  timeouts: {
    agents: 10_000,
    session: 15_000,
    chat: 300_000,
  },
  cookieKeys: {
    userId: "ai_agent_drawio.userId",
  },
  storageKeys: {
    agentId: "ai_agent_drawio.agentId",
    conversations: "ai_agent_drawio.conversations",
  },
  ui: {
    maxInputLength: 4000,
    maxInputHeight: 168,
  },
} as const;

/** 拼接完整接口地址 */
export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_CONFIG.baseUrl}${API_CONFIG.prefix}${normalizedPath}`;
}
