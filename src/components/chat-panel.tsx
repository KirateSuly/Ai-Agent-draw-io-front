"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

import {
  chat,
  createSession,
  fetchAgentConfigs,
  getErrorMessage,
} from "@/src/api/agent";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RefreshIcon,
  SendIcon,
  SparklesIcon,
  TrashIcon,
} from "@/src/components/icons";
import { API_CONFIG } from "@/src/config/api-config";
import type { AgentConfig } from "@/src/types/api";
import { extractDrawioXml } from "@/src/utils/drawio";

type MessageRole = "user" | "agent";
type AgentsStatus = "loading" | "ready" | "error";
type SessionStatus = "idle" | "creating" | "ready" | "error";

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  status?: "done" | "error";
  diagramXml?: string;
  retryText?: string;
}

interface ChatPanelProps {
  userId: string;
  onDiagram: (xml: string) => void;
}

const WELCOME_MESSAGE_ID = "welcome";
const AGENT_STORAGE_KEY = API_CONFIG.storageKeys.agentId;
const MAX_INPUT_HEIGHT = API_CONFIG.ui.maxInputHeight;

let messageSequence = 0;

function createMessageId(): string {
  messageSequence += 1;
  return `chat-message-${messageSequence}`;
}

function makeWelcomeMessage(agentName?: string): ChatMessage {
  return {
    id: WELCOME_MESSAGE_ID,
    role: "agent",
    content: agentName
      ? `你好，我是「${agentName}」👋\n\n描述你想画的流程图、架构图或时序图，我会生成 draw.io 图表并同步到左侧画布。`
      : "你好，我是 AI 绘图助手 👋\n\n描述你想画的流程图、架构图或时序图，我会生成 draw.io 图表并同步到左侧画布。",
  };
}

function readStoredAgentId(): string {
  try {
    return window.localStorage.getItem(AGENT_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

function storeAgentId(agentId: string): void {
  try {
    window.localStorage.setItem(AGENT_STORAGE_KEY, agentId);
  } catch {
    /* localStorage 可能被浏览器禁用，不影响主流程 */
  }
}

function shortSessionId(sessionId: string): string {
  return sessionId.length > 8 ? `${sessionId.slice(0, 8)}…` : sessionId;
}

const iconButtonClass =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-40";

function AgentAvatar({ size = "size-7" }: { size?: string }) {
  return (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-brand-strong text-white shadow-[0_6px_14px_-8px_rgba(37,99,235,0.9)]`}
      aria-hidden="true"
    >
      <SparklesIcon className="size-3.5" />
    </span>
  );
}

function DiagramDetails({ xml }: { xml: string }) {
  return (
    <details className="mt-2 border-t border-brand-border/60 pt-2">
      <summary className="cursor-pointer select-none text-[11px] font-medium text-brand transition-colors hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
        查看 draw.io XML
      </summary>
      <pre className="thin-scrollbar mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-surface/80 p-2 text-[10px] leading-relaxed text-muted-strong ring-1 ring-line">
        {xml}
      </pre>
    </details>
  );
}

function MessageBubble({
  message,
  userInitial,
  onRetry,
}: {
  message: ChatMessage;
  userInitial: string;
  onRetry: (message: ChatMessage) => void;
}) {
  const isUser = message.role === "user";
  const isError = message.status === "error";

  return (
    <div
      className={`message-in flex items-start gap-2 ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {isUser ? (
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand ring-1 ring-brand-border"
          aria-hidden="true"
        >
          {userInitial}
        </span>
      ) : (
        <AgentAvatar />
      )}

      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? "rounded-tr-sm bg-gradient-to-br from-brand-strong to-brand-hover text-white shadow-[0_10px_24px_-16px_rgba(37,99,235,0.95)]"
            : isError
              ? "rounded-tl-sm bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/30"
              : "rounded-tl-sm bg-brand-soft text-foreground ring-1 ring-brand-border/70"
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>

        {message.diagramXml ? (
          <DiagramDetails xml={message.diagramXml} />
        ) : null}

        {isError && message.retryText ? (
          <button
            type="button"
            onClick={() => onRetry(message)}
            className="mt-2 inline-flex items-center gap-1 rounded-md border border-rose-200 bg-surface/80 px-2 py-1 text-[11px] font-medium text-rose-600 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
          >
            <RefreshIcon className="size-3.5" />
            重试
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="message-in flex items-start gap-2">
      <AgentAvatar />
      <div
        className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-brand-soft px-3 py-3 ring-1 ring-brand-border/70"
        aria-hidden="true"
      >
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 animate-bounce rounded-full bg-brand/60"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function ChatPanel({ userId, onDiagram }: ChatPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    makeWelcomeMessage(),
  ]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [agentsStatus, setAgentsStatus] = useState<AgentsStatus>("loading");
  const [agentsError, setAgentsError] = useState("");
  const [agentId, setAgentId] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("idle");

  const sendingRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const userInitial = userId.trim().charAt(0).toUpperCase() || "我";
  const currentAgent =
    agents.find((agent) => agent.agentId === agentId) ?? null;
  const agentName = currentAgent?.agentName || "AI 绘图助手";
  const canInteract = agentsStatus === "ready" && Boolean(agentId);

  const resetTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, []);

  const loadAgents = useCallback(async () => {
    setAgentsStatus("loading");
    setAgentsError("");

    try {
      const list = await fetchAgentConfigs();

      if (!list.length) {
        setAgents([]);
        setAgentId("");
        setAgentsStatus("error");
        setAgentsError("后端暂无可用智能体，请检查服务端配置。");
        return;
      }

      const storedAgentId = readStoredAgentId();
      const selected =
        list.find((agent) => agent.agentId === storedAgentId) ?? list[0];

      setAgents(list);
      setAgentId(selected.agentId);
      storeAgentId(selected.agentId);
      setAgentsStatus("ready");
      setMessages((previous) =>
        previous.length === 1 && previous[0].id === WELCOME_MESSAGE_ID
          ? [makeWelcomeMessage(selected.agentName)]
          : previous,
      );
    } catch (error) {
      setAgents([]);
      setAgentId("");
      setAgentsStatus("error");
      setAgentsError(getErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, pending, collapsed, agentsStatus]);

  const submitMessage = useCallback(
    async (rawText: string, options: { appendUser?: boolean } = {}) => {
      const content = rawText.trim();

      if (
        !content ||
        sendingRef.current ||
        agentsStatus !== "ready" ||
        !agentId ||
        !userId
      ) {
        return;
      }

      sendingRef.current = true;
      setPending(true);

      if (options.appendUser !== false) {
        setMessages((previous) => [
          ...previous,
          { id: createMessageId(), role: "user", content },
        ]);
        setDraft("");
        resetTextareaHeight();
      }

      try {
        let activeSessionId = sessionId;

        if (!activeSessionId) {
          setSessionStatus("creating");
          try {
            const session = await createSession({ agentId, userId });
            if (!session?.sessionId) {
              throw new Error("创建会话失败：后端未返回 sessionId");
            }
            activeSessionId = session.sessionId;
            setSessionId(activeSessionId);
            setSessionStatus("ready");
          } catch (error) {
            setSessionStatus("error");
            throw error;
          }
        }

        const response = await chat({
          agentId,
          userId,
          sessionId: activeSessionId,
          message: content,
        });

        const reply = String(response?.content ?? "").trim();
        const diagramXml = extractDrawioXml(reply);

        if (diagramXml) {
          onDiagram(diagramXml);
          setMessages((previous) => [
            ...previous,
            {
              id: createMessageId(),
              role: "agent",
              content: "已生成图表，并同步到左侧 draw.io 画布。",
              diagramXml,
            },
          ]);
        } else {
          setMessages((previous) => [
            ...previous,
            {
              id: createMessageId(),
              role: "agent",
              content: reply || "（智能体没有返回内容）",
            },
          ]);
        }
      } catch (error) {
        setMessages((previous) => [
          ...previous,
          {
            id: createMessageId(),
            role: "agent",
            status: "error",
            content: getErrorMessage(error),
            retryText: content,
          },
        ]);
      } finally {
        sendingRef.current = false;
        setPending(false);
      }
    },
    [agentId, agentsStatus, onDiagram, resetTextareaHeight, sessionId, userId],
  );

  const handleSend = useCallback(() => {
    void submitMessage(draft);
  }, [draft, submitMessage]);

  const handleRetry = useCallback(
    (message: ChatMessage) => {
      if (!message.retryText) {
        return;
      }
      setMessages((previous) =>
        previous.filter((item) => item.id !== message.id),
      );
      void submitMessage(message.retryText, { appendUser: false });
    },
    [submitMessage],
  );

  const handleDraftChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(event.target.value);
    const element = event.currentTarget;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    // 中文输入法组合输入时按 Enter 是确认候选词，不应发送消息。
    if (event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    handleSend();
  };

  const handleAgentChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextAgentId = event.target.value;
    if (!nextAgentId || nextAgentId === agentId || pending) {
      return;
    }

    const nextAgent = agents.find((agent) => agent.agentId === nextAgentId);
    if (!nextAgent) {
      return;
    }

    setAgentId(nextAgentId);
    storeAgentId(nextAgentId);
    setSessionId(null);
    setSessionStatus("idle");
    setMessages([makeWelcomeMessage(nextAgent.agentName)]);
    setDraft("");
    resetTextareaHeight();
    textareaRef.current?.focus();
  };

  const handleClear = useCallback(() => {
    if (pending) {
      return;
    }
    setMessages([makeWelcomeMessage(agentName)]);
    setSessionId(null);
    setSessionStatus("idle");
    setDraft("");
    resetTextareaHeight();
  }, [agentName, pending, resetTextareaHeight]);

  const canClear = messages.length > 1 || draft.length > 0;

  const sessionLabel = (() => {
    if (agentsStatus === "loading") {
      return "正在连接智能体服务…";
    }
    if (agentsStatus === "error") {
      return "智能体服务不可用";
    }
    if (sessionStatus === "creating") {
      return "正在创建会话…";
    }
    if (sessionStatus === "ready" && sessionId) {
      return `会话 ${shortSessionId(sessionId)}`;
    }
    if (sessionStatus === "error") {
      return "会话创建失败，发送时重试";
    }
    return "首次发送时自动创建会话";
  })();

  const statusDotClass =
    agentsStatus === "error" || sessionStatus === "error"
      ? "bg-rose-500"
      : agentsStatus === "loading" || sessionStatus === "creating"
        ? "animate-pulse bg-brand"
        : sessionStatus === "ready"
          ? "bg-success"
          : "bg-muted/50";

  const textareaPlaceholder =
    agentsStatus === "loading"
      ? "正在连接智能体…"
      : agentsStatus === "error"
        ? "智能体不可用，请先重试"
        : "描述你想画的图表…";

  return (
    <aside
      id="ai-chat-panel"
      aria-label="AI 绘图助手对话"
      className={`panel chat-panel flex shrink-0 flex-col overflow-hidden rounded-xl transition-[width] duration-300 ease-out ${
        collapsed
          ? "w-12"
          : "w-[22rem] max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-20 max-lg:w-[min(22rem,calc(100%-1rem))]"
      }`}
    >
      {collapsed ? (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-expanded={false}
          aria-controls="ai-chat-panel"
          aria-label="展开 AI 绘图助手对话"
          title="展开对话"
          className="flex h-full w-full flex-col items-center justify-between gap-4 bg-brand-softer py-3 text-brand transition-colors hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40"
        >
          <ChevronLeftIcon className="size-4" />
          <span className="text-[11px] font-medium tracking-[0.22em] [writing-mode:vertical-rl]">
            AI 对话
          </span>
          <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-brand-strong text-white shadow-[0_6px_14px_-8px_rgba(37,99,235,0.9)]">
            <SparklesIcon className="size-3.5" />
          </span>
        </button>
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <header className="flex items-center gap-2.5 border-b border-line bg-gradient-to-r from-brand-softer via-surface to-surface px-3.5 py-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-brand-strong text-white shadow-[0_8px_18px_-10px_rgba(37,99,235,0.9)]">
              <SparklesIcon className="size-4" />
            </span>

            <div className="min-w-0 flex-1">
              {agentsStatus === "ready" && currentAgent ? (
                <div className="relative min-w-0">
                  <select
                    value={agentId}
                    onChange={handleAgentChange}
                    disabled={pending}
                    aria-label="选择智能体"
                    title={currentAgent.agentDesc || currentAgent.agentName}
                    className="w-full cursor-pointer appearance-none truncate rounded-md bg-transparent py-0 pr-5 text-sm font-semibold tracking-tight text-foreground outline-none transition-colors hover:text-brand focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {agents.map((agent) => (
                      <option key={agent.agentId} value={agent.agentId}>
                        {agent.agentName || `智能体 ${agent.agentId}`}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-0 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
                </div>
              ) : (
                <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">
                  {agentsStatus === "loading"
                    ? "正在连接智能体…"
                    : "AI 绘图助手"}
                </h2>
              )}

              {agentsStatus === "error" ? (
                <button
                  type="button"
                  onClick={() => void loadAgents()}
                  title={agentsError}
                  className="mt-0.5 flex max-w-full items-center gap-1 rounded text-[11px] text-rose-500 transition-colors hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 dark:text-rose-300"
                >
                  <RefreshIcon className="size-3 shrink-0" />
                  <span className="truncate">加载失败，点击重试</span>
                </button>
              ) : (
                <p
                  className="flex items-center gap-1.5 text-[11px] text-muted"
                  title={
                    sessionStatus === "ready" && sessionId
                      ? `当前会话：${sessionId}`
                      : undefined
                  }
                >
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${statusDotClass}`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{sessionLabel}</span>
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleClear}
              disabled={pending || !canClear}
              aria-label="清空对话"
              title="清空对话"
              className={iconButtonClass}
            >
              <TrashIcon />
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-expanded={true}
              aria-controls="ai-chat-panel"
              aria-label="收起对话面板"
              title="收起对话"
              className={iconButtonClass}
            >
              <ChevronRightIcon />
            </button>
          </header>

          <div
            ref={scrollContainerRef}
            role="log"
            aria-live="polite"
            aria-label="对话消息"
            className="thin-scrollbar min-h-0 flex-1 space-y-3.5 overflow-y-auto px-3.5 py-4"
          >
            {agentsStatus === "loading" ? (
              <div className="message-in flex items-center gap-2 rounded-xl border border-brand-border/60 bg-brand-softer px-3 py-2 text-[11px] text-muted">
                <span className="size-1.5 animate-pulse rounded-full bg-brand" />
                正在连接智能体服务…
              </div>
            ) : null}

            {agentsStatus === "error" ? (
              <div className="message-in rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                <p className="font-medium">智能体服务连接失败</p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-[11px] leading-relaxed opacity-90">
                  {agentsError}
                </p>
                <button
                  type="button"
                  onClick={() => void loadAgents()}
                  className="mt-2 inline-flex items-center gap-1 rounded-md border border-rose-200 bg-surface/80 px-2 py-1 text-[11px] font-medium text-rose-600 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
                >
                  <RefreshIcon className="size-3.5" />
                  重新加载
                </button>
              </div>
            ) : null}

            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                userInitial={userInitial}
                onRetry={handleRetry}
              />
            ))}

            {pending ? <TypingIndicator /> : null}

            <div className="sr-only" role="status">
              {pending ? "智能体正在回复" : ""}
            </div>
          </div>

          <form
            className="border-t border-line bg-brand-softer/50 px-3.5 py-3"
            onSubmit={(event) => {
              event.preventDefault();
              handleSend();
            }}
          >
            <div className="flex items-end gap-2 rounded-xl border border-line bg-surface p-1.5 shadow-sm transition-all focus-within:border-brand-border focus-within:ring-4 focus-within:ring-brand/10">
              <textarea
                ref={textareaRef}
                rows={1}
                value={draft}
                onChange={handleDraftChange}
                onKeyDown={handleKeyDown}
                disabled={!canInteract}
                maxLength={API_CONFIG.ui.maxInputLength}
                placeholder={textareaPlaceholder}
                aria-label="输入消息"
                className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-6 text-foreground outline-none placeholder:text-muted/70 disabled:cursor-not-allowed disabled:opacity-70"
              />
              <button
                type="submit"
                disabled={!canInteract || pending || !draft.trim()}
                aria-label="发送消息"
                title="发送"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-strong text-white shadow-[0_8px_18px_-10px_rgba(37,99,235,0.9)] transition-all hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:bg-line disabled:text-muted disabled:shadow-none"
              >
                <SendIcon className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted/80">
              Enter 发送 · Shift + Enter 换行
            </p>
          </form>
        </div>
      )}
    </aside>
  );
}
