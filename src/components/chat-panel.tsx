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
  ChevronLeftIcon,
  ChevronRightIcon,
  SendIcon,
  SparklesIcon,
  TrashIcon,
} from "@/src/components/icons";

type MessageRole = "user" | "agent";

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "agent",
  content:
    "你好，我是 AI 绘图助手 👋\n\n描述你想画的流程图、架构图或时序图，我会在左侧画布中帮你生成并调整。",
};

/**
 * 演示阶段：使用本地延时模拟 Agent 回复。
 * 接入后端时，把 handleSend 里的 setTimeout 替换为真实接口调用即可。
 */
const DEMO_REPLY_DELAY = 900;

let messageSequence = 0;

function createMessageId(): string {
  messageSequence += 1;
  return `chat-message-${messageSequence}`;
}

function buildDemoReply(prompt: string): string {
  const brief = prompt.length > 60 ? `${prompt.slice(0, 60)}…` : prompt;
  return `收到：“${brief}”\n\n这是前端演示回复。接入 Agent 服务后，我会解析这段描述、生成 draw.io 图表并同步到左侧画布。`;
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

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

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
          我
        </span>
      ) : (
        <AgentAvatar />
      )}
      <div
        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? "rounded-tr-sm bg-gradient-to-br from-brand-strong to-brand-hover text-white shadow-[0_10px_24px_-16px_rgba(37,99,235,0.95)]"
            : "rounded-tl-sm bg-brand-soft text-foreground ring-1 ring-brand-border/70"
        }`}
      >
        {message.content}
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

export default function ChatPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  const replyTimerRef = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resetTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, []);

  useEffect(() => {
    return () => {
      if (replyTimerRef.current !== null) {
        window.clearTimeout(replyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, pending, collapsed]);

  const handleSend = useCallback(() => {
    const content = draft.trim();
    if (!content || pending) {
      return;
    }

    setMessages((previous) => [
      ...previous,
      { id: createMessageId(), role: "user", content },
    ]);
    setDraft("");
    resetTextareaHeight();
    setPending(true);

    replyTimerRef.current = window.setTimeout(() => {
      setMessages((previous) => [
        ...previous,
        {
          id: createMessageId(),
          role: "agent",
          content: buildDemoReply(content),
        },
      ]);
      setPending(false);
      replyTimerRef.current = null;
    }, DEMO_REPLY_DELAY);
  }, [draft, pending, resetTextareaHeight]);

  const handleDraftChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(event.target.value);
    const element = event.currentTarget;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 128)}px`;
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

  const handleClear = useCallback(() => {
    if (replyTimerRef.current !== null) {
      window.clearTimeout(replyTimerRef.current);
      replyTimerRef.current = null;
    }
    setPending(false);
    setMessages([WELCOME_MESSAGE]);
    setDraft("");
    resetTextareaHeight();
  }, [resetTextareaHeight]);

  const canClear = messages.length > 1 || draft.length > 0 || pending;

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
              <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">
                AI 绘图助手
              </h2>
              <p className="flex items-center gap-1.5 text-[11px] text-muted">
                <span
                  className="size-1.5 rounded-full bg-success"
                  aria-hidden="true"
                />
                在线 · 演示模式
              </p>
            </div>
            <button
              type="button"
              onClick={handleClear}
              disabled={!canClear}
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
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {pending && <TypingIndicator />}
            <div className="sr-only" role="status">
              {pending ? "AI 正在回复" : ""}
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
                placeholder="描述你想画的图表…"
                aria-label="输入消息"
                className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-6 text-foreground outline-none placeholder:text-muted/70"
              />
              <button
                type="submit"
                disabled={!draft.trim() || pending}
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
