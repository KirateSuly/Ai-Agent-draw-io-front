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

/** 对话响应；content 为智能体完整回复 */
export interface ChatResponse {
  content: string;
}
