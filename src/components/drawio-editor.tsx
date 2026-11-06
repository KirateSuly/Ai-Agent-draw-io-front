"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DrawIoEmbed,
  type DrawIoEmbedRef,
  type EventAutoSave,
  type EventExport,
} from "react-drawio";

import ChatPanel from "@/src/components/chat-panel";
import {
  DiagramIcon,
  DownloadIcon,
  FolderOpenIcon,
  LogOutIcon,
  RefreshIcon,
  SaveIcon,
  TrashIcon,
} from "@/src/components/icons";
import { clearUserId } from "@/src/utils/cookie";
import {
  getDiagramViewBox,
  type DiagramViewBox,
} from "@/src/utils/drawio";

const STORAGE_KEY = "drawio-demo-diagram";
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
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand-strong px-3.5 text-sm font-medium text-white shadow-[0_10px_22px_-12px_rgba(37,99,235,0.9)] transition-all hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50";

const buttonClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-muted-strong transition-all hover:border-brand-border hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-50";

const dangerButtonClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-transparent px-3 text-sm font-medium text-muted transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-300";

const iconButtonClass =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

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
  const pendingDiagramRef = useRef<string | null>(null);
  const lastSyncedDiagramRef = useRef<string | null>(null);

  const [xml, setXml] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [previewFormat, setPreviewFormat] = useState<ExportFormat>("xmlsvg");
  const [status, setStatus] = useState("正在加载 draw.io 编辑器…");
  const [isDrawioReady, setIsDrawioReady] = useState(false);
  const [showLoadHelp, setShowLoadHelp] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    if (isDrawioReady) {
      return;
    }
    const timer = window.setTimeout(() => setShowLoadHelp(true), 12000);
    return () => window.clearTimeout(timer);
  }, [isDrawioReady, editorKey]);

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

  const handleDrawioLoad = useCallback(() => {
    setIsDrawioReady(true);
    setShowLoadHelp(false);

    const pendingXml = pendingDiagramRef.current;
    if (pendingXml) {
      loadDiagram(pendingXml);
      pendingDiagramRef.current = null;
      setStatus("已根据智能体回复更新图表");
      return;
    }

    if (lastSyncedDiagramRef.current) {
      setStatus("已根据智能体回复更新图表");
      return;
    }

    setStatus("编辑器加载完成，开始绘图吧");
  }, [loadDiagram]);

  const handleApplyDiagram = useCallback(
    (diagramXml: string) => {
      setXml(diagramXml);
      lastSyncedDiagramRef.current = diagramXml;
      pendingDiagramRef.current = diagramXml;

      if (isDrawioReady && loadDiagram(diagramXml)) {
        pendingDiagramRef.current = null;
        setStatus("已根据智能体回复更新图表");
      } else {
        setStatus("图表已生成，等待 draw.io 加载完成后同步…");
      }
    },
    [isDrawioReady, loadDiagram],
  );

  const handleRetryLoad = useCallback(() => {
    setShowLoadHelp(false);
    setIsDrawioReady(false);
    if (xml) {
      pendingDiagramRef.current = xml;
    }
    setEditorKey((key) => key + 1);
    setStatus("正在重新加载 draw.io 编辑器…");
  }, [xml]);

  const handleLogout = useCallback(() => {
    clearUserId();
    window.location.replace("/login");
  }, []);

  const userInitial = userId.trim().charAt(0).toUpperCase() || "U";

  const handleExport = useCallback((format: ExportFormat) => {
    setPreviewFormat(format);
    drawioRef.current?.exportDiagram({ format });
    setStatus(`正在导出 ${format === "png" ? "PNG" : "SVG"}…`);
  }, []);

  const handleExported = useCallback((data: EventExport) => {
    setPreview(data.data);
    if (data.xml) {
      setXml(data.xml);
    }
    setStatus(`已导出 ${data.format.toUpperCase()}`);
  }, []);

  const handleAutoSave = useCallback((data: EventAutoSave) => {
    setXml(data.xml);
  }, []);

  const handleSaveLocal = useCallback(() => {
    if (!xml) {
      setStatus("图表尚未加载完成，无法保存");
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, xml);
    setStatus("已保存到浏览器 localStorage");
  }, [xml]);

  const handleLoadLocal = useCallback(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      setStatus("localStorage 中没有已保存的图表");
      return;
    }
    setPreview(null);
    lastSyncedDiagramRef.current = null;
    drawioRef.current?.load({ xml: saved });
    setStatus("已从 localStorage 加载图表");
  }, []);

  const handleClear = useCallback(() => {
    setPreview(null);
    setXml("");
    lastSyncedDiagramRef.current = null;
    drawioRef.current?.load({ xml: "" });
    setStatus("已清空画布");
  }, []);

  const isBusy = status.includes("正在");

  return (
    <div className="flex h-dvh flex-col text-foreground">
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-surface/80 px-4 py-3 backdrop-blur-xl">
        <div className="mr-auto flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-brand-strong text-white shadow-[0_10px_22px_-10px_rgba(37,99,235,0.85)]">
            <DiagramIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground">
              Draw.io 编辑器
            </h1>
            <p className="hidden text-[11px] text-muted sm:block">
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
            <DownloadIcon className="size-4" />
            导出 SVG
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() => handleExport("png")}
          >
            <DownloadIcon className="size-4" />
            导出 PNG
          </button>
          <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden />
          <button
            type="button"
            className={buttonClass}
            onClick={handleSaveLocal}
          >
            <SaveIcon className="size-4" />
            保存
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={handleLoadLocal}
          >
            <FolderOpenIcon className="size-4" />
            加载
          </button>
          <button
            type="button"
            className={dangerButtonClass}
            onClick={handleClear}
          >
            <TrashIcon className="size-4" />
            清空
          </button>
        </div>

        <span className="hidden h-6 w-px bg-line sm:block" aria-hidden />
        <div className="flex items-center gap-1.5">
          <span
            className="flex max-w-44 items-center gap-2 rounded-lg border border-line bg-surface-muted px-2 py-1.5"
            title={`当前用户：${userId}`}
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand ring-1 ring-brand-border">
              {userInitial}
            </span>
            <span className="hidden max-w-28 truncate text-xs font-medium text-muted-strong sm:block">
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
            <LogOutIcon />
          </button>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 gap-3 p-3 sm:gap-4 sm:p-4">
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
            onClose={(data) =>
              setStatus(
                data.parentEvent === "save" ? "图表已保存" : "已退出编辑器",
              )
            }
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

        <ChatPanel userId={userId} onDiagram={handleApplyDiagram} />
      </main>

      <footer className="flex items-center gap-2 border-t border-line bg-surface/80 px-4 py-2 text-xs text-muted backdrop-blur-xl">
        <span
          className={`size-1.5 shrink-0 rounded-full ${
            isBusy ? "animate-pulse bg-brand" : "bg-success"
          }`}
          aria-hidden="true"
        />
        <span className="truncate">{status}</span>
      </footer>
    </div>
  );
}
