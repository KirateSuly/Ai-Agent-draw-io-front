"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DrawIoEmbed,
  type DrawIoEmbedRef,
  type EventAutoSave,
  type EventExport,
} from "react-drawio";

import ChatPanel from "@/src/components/chat-panel";
import ConversationSidebar from "@/src/components/conversation-sidebar";
import {
  ChatIcon,
  ChevronRightIcon,
  DiagramIcon,
  DownloadIcon,
  LogOutIcon,
  RefreshIcon,
} from "@/src/components/icons";
import type { ConversationBookmark } from "@/src/types/conversation";
import {
  createBlankConversation,
  deriveConversationTitle,
  loadConversationStore,
  saveConversationStore,
  sortConversationsByUpdatedAt,
} from "@/src/utils/conversation-storage";
import { clearUserId } from "@/src/utils/cookie";
import {
  getDiagramViewBox,
  type DiagramViewBox,
} from "@/src/utils/drawio";

const DIAGRAM_VIEWBOX_PADDING = 24;

/**
 * draw.io 官方嵌入地址。若所在网络无法访问 embed.diagrams.net，
 * 可自建 draw.io 服务并通过 NEXT_PUBLIC_DRAWIO_BASE_URL 指向它。
 */
const DRAWIO_BASE_URL = process.env.NEXT_PUBLIC_DRAWIO_BASE_URL;

/**
 * draw.io 格式面板里的按钮（更改、编辑数据、清除默认风格等）没有显式设置字号，
 * 会跟随浏览器的默认按钮字号。浏览器默认字体调大时，这些按钮会变大并溢出面板。
 * 通过 draw.io 官方的 configuration.css 固定右侧面板的字号并禁止文字溢出。
 */
const DRAWIO_UI_CSS = `
.geFormatContainer,
.geFormatContainer .geTitle,
.geFormatContainer .geLabel,
.geFormatContainer button,
.geFormatContainer .geBtn,
.geFormatContainer .geFullWidthElement,
.geFormatContainer input,
.geFormatContainer select {
  font-size: 12px !important;
}
.geFormatContainer button,
.geFormatContainer .geBtn,
.geFormatContainer .geFullWidthElement {
  font-family: inherit !important;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
`;

type ExportFormat = "xmlsvg" | "png";

const primaryButtonClass =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-brand-strong px-3 text-xs font-medium text-white shadow-[0_10px_22px_-12px_rgba(37,99,235,0.9)] transition-all hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50";

const buttonClass =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-muted-strong transition-all hover:border-brand-border hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-50";

const iconButtonClass =
  "inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

interface DrawIoEditorProps {
  userId: string;
}

type DrawioLoadPayload = {
  xml: string;
  fit?: number;
  maxFitScale?: number;
  viewbox?: DiagramViewBox;
  border?: number;
};

type DrawioLoadAction = (payload: DrawioLoadPayload) => void;

export default function DrawIoEditor({ userId }: DrawIoEditorProps) {
  const drawioRef = useRef<DrawIoEmbedRef>(null);
  const drawioReadyRef = useRef(false);
  const activeConversationRef = useRef<ConversationBookmark | null>(null);
  const suppressAutoSaveRef = useRef(true);
  const suppressAutoSaveTimerRef = useRef<number | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [previewFormat, setPreviewFormat] = useState<ExportFormat>("xmlsvg");
  const [isDrawioReady, setIsDrawioReady] = useState(false);
  const [showLoadHelp, setShowLoadHelp] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [showConversationList, setShowConversationList] = useState(true);

  const [conversations, setConversations] = useState<ConversationBookmark[]>(
    [],
  );
  const [activeConversationId, setActiveConversationId] = useState("");
  const [storeReady, setStoreReady] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);

  const activeConversation =
    conversations.find(
      (conversation) => conversation.id === activeConversationId,
    ) ?? null;

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  const loadDiagram = useCallback((diagramXml: string) => {
    const target = drawioRef.current;
    if (!target) {
      return false;
    }

    const viewBox = getDiagramViewBox(diagramXml);
    const paddedViewBox = viewBox
      ? {
          x: viewBox.x - DIAGRAM_VIEWBOX_PADDING,
          y: viewBox.y - DIAGRAM_VIEWBOX_PADDING,
          width: viewBox.width + DIAGRAM_VIEWBOX_PADDING * 2,
          height: viewBox.height + DIAGRAM_VIEWBOX_PADDING * 2,
        }
      : null;

    // react-drawio 未声明 draw.io load 动作的 viewbox/fit 参数，但会把额外字段原样转发。
    (target.load as unknown as DrawioLoadAction)({
      xml: diagramXml,
      ...(paddedViewBox
        ? { viewbox: paddedViewBox, border: 0 }
        : { fit: 1, maxFitScale: 1 }),
    });
    return true;
  }, []);

  const updateConversationById = useCallback(
    (
      conversationId: string,
      updater: (
        conversation: ConversationBookmark,
      ) => ConversationBookmark,
    ) => {
      setConversations((previous) => {
        const target = previous.find(
          (conversation) => conversation.id === conversationId,
        );
        if (!target) {
          return previous;
        }

        const updated = updater(target);
        if (updated === target) {
          return previous;
        }

        const nextTitle = updated.isTitleCustom
          ? updated.title.trim() || "新对话"
          : deriveConversationTitle(updated.messages);
        const nextConversation: ConversationBookmark = {
          ...updated,
          title: nextTitle,
          updatedAt: Math.max(Date.now(), target.updatedAt + 1),
        };

        // 最近更新的书签移动到最上面
        return [
          nextConversation,
          ...previous.filter(
            (conversation) => conversation.id !== conversationId,
          ),
        ];
      });
    },
    [],
  );

  const updateActiveConversation = useCallback(
    (
      updater: (
        conversation: ConversationBookmark,
      ) => ConversationBookmark,
    ) => {
      if (!activeConversationId) {
        return;
      }
      updateConversationById(activeConversationId, updater);
    },
    [activeConversationId, updateConversationById],
  );

  /** 程序化加载画布时，忽略 draw.io 回传的自动保存，避免误改“最后修改时间” */
  const markProgrammaticLoad = useCallback(() => {
    suppressAutoSaveRef.current = true;
    if (suppressAutoSaveTimerRef.current !== null) {
      window.clearTimeout(suppressAutoSaveTimerRef.current);
    }
    suppressAutoSaveTimerRef.current = window.setTimeout(() => {
      suppressAutoSaveRef.current = false;
      suppressAutoSaveTimerRef.current = null;
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (suppressAutoSaveTimerRef.current !== null) {
        window.clearTimeout(suppressAutoSaveTimerRef.current);
      }
    };
  }, []);

  /** 初始化：读取当前用户的书签，没有则创建第一个空白对话 */
  useEffect(() => {
    const stored = loadConversationStore(userId);
    const nextConversations = stored.conversations.length
      ? stored.conversations
      : [createBlankConversation()];
    const sorted = sortConversationsByUpdatedAt(nextConversations);
    const current =
      sorted.find(
        (conversation) => conversation.id === stored.activeConversationId,
      ) ?? sorted[0];

    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage 只能在客户端挂载后读取一次
    setConversations(sorted);
    setActiveConversationId(current.id);
    setStoreReady(true);
  }, [userId]);

  /** 对话内容、当前书签和全部画布 XML 一起防抖写入浏览器 */
  useEffect(() => {
    if (!storeReady) {
      return;
    }

    const persist = () => {
      saveConversationStore(userId, {
        version: 1,
        activeConversationId: activeConversationId || null,
        conversations,
      });
    };
    const timer = window.setTimeout(persist, 300);

    window.addEventListener("pagehide", persist);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", persist);
    };
  }, [userId, storeReady, activeConversationId, conversations]);

  useEffect(() => {
    if (isDrawioReady) {
      return;
    }
    const timer = window.setTimeout(() => setShowLoadHelp(true), 12000);
    return () => window.clearTimeout(timer);
  }, [isDrawioReady, editorKey]);

  /** 切换书签、重载编辑器后，把当前书签对应的画布恢复到 draw.io */
  useEffect(() => {
    if (!storeReady || !isDrawioReady) {
      return;
    }

    const conversation = activeConversationRef.current;
    if (!conversation) {
      return;
    }

    const diagramXml = conversation.diagramXml || "";
    markProgrammaticLoad();
    loadDiagram(diagramXml);
  }, [
    activeConversationId,
    isDrawioReady,
    storeReady,
    loadDiagram,
    markProgrammaticLoad,
  ]);

  const handleDrawioLoad = useCallback(() => {
    drawioReadyRef.current = true;
    setIsDrawioReady(true);
    setShowLoadHelp(false);
  }, []);

  const handleRetryLoad = useCallback(() => {
    drawioReadyRef.current = false;
    setShowLoadHelp(false);
    setIsDrawioReady(false);
    setEditorKey((key) => key + 1);
  }, []);

  const handleApplyDiagram = useCallback(
    (diagramXml: string) => {
      updateActiveConversation((conversation) =>
        conversation.diagramXml === diagramXml
          ? conversation
          : { ...conversation, diagramXml },
      );

      if (drawioReadyRef.current) {
        markProgrammaticLoad();
        loadDiagram(diagramXml);
      }
    },
    [loadDiagram, markProgrammaticLoad, updateActiveConversation],
  );

  const handleLogout = useCallback(() => {
    clearUserId();
    window.location.replace("/login");
  }, []);

  const userInitial = userId.trim().charAt(0).toUpperCase() || "U";

  const handleExport = useCallback((format: ExportFormat) => {
    setPreviewFormat(format);
    drawioRef.current?.exportDiagram({ format });
  }, []);

  const handleExported = useCallback((data: EventExport) => {
    setPreview(data.data);
  }, []);

  const handleAutoSave = useCallback(
    (data: EventAutoSave) => {
      if (suppressAutoSaveRef.current) {
        return;
      }
      updateActiveConversation((conversation) =>
        conversation.diagramXml === data.xml
          ? conversation
          : { ...conversation, diagramXml: data.xml },
      );
    },
    [updateActiveConversation],
  );

  const handleCreateConversation = useCallback(() => {
    if (chatBusy) {
      return;
    }

    const current = activeConversationRef.current;
    const conversation = createBlankConversation(current?.agentId ?? "");
    setConversations((previous) => [conversation, ...previous]);
    setActiveConversationId(conversation.id);
    setPreview(null);
  }, [chatBusy]);

  const handleRenameConversation = useCallback(
    (conversationId: string, nextTitle: string) => {
      const title = nextTitle.replace(/\s+/g, " ").trim().slice(0, 30);
      if (!title) {
        return;
      }

      updateConversationById(conversationId, (conversation) => ({
        ...conversation,
        title,
        isTitleCustom: true,
      }));
    },
    [updateConversationById],
  );

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      if (chatBusy || conversationId === activeConversationId) {
        return;
      }

      if (
        !conversations.some(
          (conversation) => conversation.id === conversationId,
        )
      ) {
        return;
      }

      // 切换历史对话只改变当前选择，不刷新“最后修改时间”
      setActiveConversationId(conversationId);
      setPreview(null);
    },
    [activeConversationId, chatBusy, conversations],
  );

  const handleDeleteConversation = useCallback(
    (conversationId: string) => {
      if (chatBusy) {
        return;
      }

      const target = conversations.find(
        (conversation) => conversation.id === conversationId,
      );
      if (!target) {
        return;
      }

      const remaining = conversations.filter(
        (conversation) => conversation.id !== conversationId,
      );

      if (!remaining.length) {
        const replacement = createBlankConversation(target.agentId);
        setConversations([replacement]);
        setActiveConversationId(replacement.id);
        setPreview(null);
        return;
      }

      setConversations(remaining);
      if (conversationId === activeConversationId) {
        setActiveConversationId(remaining[0].id);
        setPreview(null);
      }
    },
    [activeConversationId, chatBusy, conversations],
  );

  const handleChatBusyChange = useCallback((busy: boolean) => {
    setChatBusy(busy);
  }, []);

  if (!storeReady || !activeConversation) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 text-muted">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-brand-strong text-white shadow-[0_12px_28px_-12px_rgba(37,99,235,0.9)]">
          <DiagramIcon className="size-6" />
        </span>
        <p className="text-xs">正在加载历史对话…</p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col text-foreground">
      <header className="flex flex-wrap items-center gap-2 border-b border-line bg-surface/80 px-4 py-2 backdrop-blur-xl">
        <div className="mr-auto flex min-w-0 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-brand-strong text-white shadow-[0_10px_22px_-10px_rgba(37,99,235,0.85)]">
            <DiagramIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">
              Draw.io 编辑器
            </h1>
            <p className="hidden text-[10px] text-muted sm:block">
              AI 驱动的在线绘图工作台
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() => handleExport("xmlsvg")}
          >
            <DownloadIcon className="size-3.5" />
            导出 SVG
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() => handleExport("png")}
          >
            <DownloadIcon className="size-3.5" />
            导出 PNG
          </button>
        </div>

        <span className="hidden h-5 w-px bg-line sm:block" aria-hidden />
        <div className="flex items-center gap-1.5">
          <span
            className="flex max-w-44 items-center gap-2 rounded-lg border border-line bg-surface-muted px-2 py-1"
            title={`当前用户：${userId}`}
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10px] font-semibold text-brand ring-1 ring-brand-border">
              {userInitial}
            </span>
            <span className="hidden max-w-28 truncate text-[11px] font-medium text-muted-strong sm:block">
              {userId}
            </span>
          </span>
          <button
            type="button"
            className={iconButtonClass}
            onClick={handleLogout}
            aria-label="退出登录"
            title="退出登录"
          >
            <LogOutIcon className="size-3.5" />
          </button>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 gap-3 p-3 sm:gap-4 sm:p-4">
        {showConversationList ? (
          <ConversationSidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            disabled={chatBusy}
            onSelect={handleSelectConversation}
            onCreate={handleCreateConversation}
            onDelete={handleDeleteConversation}
            onRename={handleRenameConversation}
            onCollapse={() => setShowConversationList(false)}
          />
        ) : (
          <aside
            aria-label="历史对话已收起"
            className="panel hidden w-11 shrink-0 flex-col items-center gap-2 overflow-hidden rounded-xl px-1 py-2 xl:flex"
          >
            <button
              type="button"
              onClick={() => setShowConversationList(true)}
              aria-label="展开历史对话"
              title="展开历史对话"
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <ChevronRightIcon className="size-4" />
            </button>
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand-soft text-brand ring-1 ring-brand-border">
              <ChatIcon className="size-3.5" />
            </span>
            <span className="[writing-mode:vertical-rl] select-none text-[10px] tracking-widest text-muted">
              历史对话
            </span>
            <span className="mt-auto rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">
              {conversations.length}
            </span>
          </aside>
        )}

        <div className="panel relative min-w-0 flex-1 overflow-hidden rounded-xl">
          <DrawIoEmbed
            key={editorKey}
            ref={drawioRef}
            baseUrl={DRAWIO_BASE_URL}
            autosave
            configuration={{ css: DRAWIO_UI_CSS }}
            urlParameters={{
              ui: "kennedy",
              spin: true,
              libraries: true,
              saveAndExit: false,
              lang: "zh",
            }}
            onLoad={handleDrawioLoad}
            onAutoSave={handleAutoSave}
            onExport={handleExported}
          />

          {showLoadHelp && (
            <div
              aria-live="polite"
              className="absolute inset-0 z-10 flex items-center justify-center bg-surface/95 p-6 backdrop-blur-sm"
            >
              <div className="flex max-w-md flex-col items-center text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand ring-1 ring-brand-border">
                  <DiagramIcon className="size-6" />
                </span>
                <h2 className="mt-4 text-sm font-semibold text-foreground">
                  draw.io 编辑器加载时间较长
                </h2>
                <p className="mt-1.5 break-words text-xs leading-relaxed text-muted">
                  请确认当前网络可以访问
                  <span className="mx-1 font-mono text-[11px] text-muted-strong">
                    embed.diagrams.net
                  </span>
                  后重试。内网环境可通过
                  <span className="mx-1 font-mono text-[11px] text-muted-strong">
                    NEXT_PUBLIC_DRAWIO_BASE_URL
                  </span>
                  配置自建的 draw.io 服务。
                </p>
                <button
                  type="button"
                  onClick={handleRetryLoad}
                  className={`${primaryButtonClass} mt-4`}
                >
                  <RefreshIcon className="size-4" />
                  重新加载
                </button>
              </div>
            </div>
          )}
        </div>

        {preview && (
          <aside className="panel hidden w-80 shrink-0 flex-col overflow-hidden rounded-xl lg:flex">
            <div className="flex items-center justify-between gap-2 border-b border-line px-3.5 py-2.5">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <DownloadIcon className="size-4 text-brand" />
                导出预览
                <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-brand">
                  {previewFormat === "png" ? "PNG" : "SVG"}
                </span>
              </span>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                onClick={() => setPreview(null)}
              >
                关闭
              </button>
            </div>
            <div className="thin-scrollbar flex flex-1 items-center justify-center overflow-auto bg-[repeating-conic-gradient(#eaf2fd_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px] p-3 dark:bg-none dark:bg-surface-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="导出的图表预览"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </aside>
        )}

        <ChatPanel
          userId={userId}
          conversation={activeConversation}
          onUpdateConversation={updateActiveConversation}
          onDiagram={handleApplyDiagram}
          onBusyChange={handleChatBusyChange}
        />
      </main>
    </div>
  );
}
