import { API_CONFIG, buildApiUrl } from "@/src/config/api-config";
import type {
  AgentConfig,
  ApiResponse,
  ChatRequest,
  ChatResponse,
  CreateSessionRequest,
  CreateSessionResponse,
} from "@/src/types/api";

export type ApiErrorType =
  | "timeout"
  | "network"
  | "http"
  | "business"
  | "parse"
  | "unknown";

interface ApiErrorOptions {
  code?: string;
  status?: number;
  type?: ApiErrorType;
}

/** 统一接口异常，页面层只需读取 message */
export class ApiError extends Error {
  readonly code?: string;
  readonly status?: number;
  readonly type: ApiErrorType;

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = "ApiError";
    this.code = options.code;
    this.status = options.status;
    this.type = options.type ?? "unknown";
  }
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  timeout?: number;
}

function networkHint(): string {
  const target = API_CONFIG.baseUrl || "当前页面同源地址";
  return `无法连接后端服务，请确认 ${target} 已启动，且允许跨域访问。`;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const timeout = options.timeout ?? 20_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const hasBody = options.body !== undefined;

  try {
    const response = await fetch(buildApiUrl(path), {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
      },
      body: hasBody ? JSON.stringify(options.body) : undefined,
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      signal: controller.signal,
    });

    const rawText = await response.text();
    let payload: ApiResponse<T> | null = null;
    if (rawText) {
      try {
        payload = JSON.parse(rawText) as ApiResponse<T>;
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      let message = `请求失败（HTTP ${response.status}）`;
      if (response.status === 404) {
        message = "接口不存在（HTTP 404）：请检查后端地址与 API 前缀";
      } else if (response.status === 405) {
        message = "接口方法不匹配（HTTP 405）：请确认后端 create_session 已使用 POST";
      } else if (response.status >= 500) {
        message = `后端服务异常（HTTP ${response.status}）`;
      }
      if (payload?.info) {
        message = `${message}：${payload.info}`;
      }
      throw new ApiError(message, {
        status: response.status,
        type: "http",
        code: payload?.code,
      });
    }

    if (!payload || typeof payload !== "object") {
      throw new ApiError("响应格式异常，无法解析后端返回内容", {
        status: response.status,
        type: "parse",
      });
    }

    if (payload.code !== "0000") {
      throw new ApiError(payload.info || payload.code || "业务处理失败", {
        code: payload.code,
        status: response.status,
        type: "business",
      });
    }

    return payload.data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (
      error &&
      typeof error === "object" &&
      (error as { name?: string }).name === "AbortError"
    ) {
      throw new ApiError(
        `请求超时（${Math.round(timeout / 1000)} 秒），请稍后重试`,
        { type: "timeout" },
      );
    }
    throw new ApiError(networkHint(), { type: "network" });
  } finally {
    clearTimeout(timer);
  }
}

/** 查询智能体列表 */
export async function fetchAgentConfigs(): Promise<AgentConfig[]> {
  const data = await request<AgentConfig[]>("/query_ai_agent_config_list", {
    timeout: API_CONFIG.timeouts.agents,
  });

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((agent) => ({
      agentId: String(agent?.agentId ?? ""),
      agentName: agent?.agentName || `智能体 ${agent?.agentId ?? ""}`.trim(),
      agentDesc: agent?.agentDesc ?? "",
    }))
    .filter((agent) => Boolean(agent.agentId));
}

/**
 * 创建会话。
 * 兼容旧后端：若 POST 返回 405，则退回 GET 查询参数形式。
 */
export async function createSession(
  payload: CreateSessionRequest,
): Promise<CreateSessionResponse> {
  try {
    return await request<CreateSessionResponse>("/create_session", {
      method: "POST",
      body: payload,
      timeout: API_CONFIG.timeouts.session,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 405) {
      const query = new URLSearchParams({
        agentId: payload.agentId,
        userId: payload.userId,
      });
      return request<CreateSessionResponse>(`/create_session?${query}`, {
        method: "GET",
        timeout: API_CONFIG.timeouts.session,
      });
    }
    throw error;
  }
}

/** 同步对话；智能体返回完整内容 */
export function chat(payload: ChatRequest): Promise<ChatResponse> {
  return request<ChatResponse>("/chat", {
    method: "POST",
    body: payload,
    timeout: API_CONFIG.timeouts.chat,
  });
}

/** 从任意异常中提取可展示的文案 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "请求失败，请稍后重试";
}
