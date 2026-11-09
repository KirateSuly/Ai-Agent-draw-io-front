/** 后端统一响应结构 */
export interface ApiResponse<T> {
  code: string;
  info: string;
  data: T;
}

/** 智能体配置 */
export interface AgentConfig {
  agentId: string;
  agentName: string;
  agentDesc?: string;
}

/** 创建会话请求 */
export interface CreateSessionRequest {
  agentId: string;
  userId: string;
}

/** 创建会话响应 */
export interface CreateSessionResponse {
  sessionId: string;
}

/** 对话请求 */
export interface ChatRequest {
  agentId: string;
  userId: string;
  sessionId: string;
  message: string;
}

/** 对话响应类型：user 为补充信息对话，drawio 为可渲染的 draw.io XML */
export type ChatResponseType = "user" | "drawio";

/** 对话响应；type 决定前端展示方式，content 为完整内容 */
export interface ChatResponse {
  type?: ChatResponseType;
  content: string;
  /** 兼容 user/drawio 双字段形式 */
  user?: string;
  drawio?: string;
}
