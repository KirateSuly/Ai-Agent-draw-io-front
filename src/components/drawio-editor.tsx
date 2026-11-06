"use client";

import { useCallback, useRef, useState } from "react";
import {
  DrawIoEmbed,
  type DrawIoEmbedRef,
  type EventAutoSave,
  type EventExport,
} from "react-drawio";

import ChatPanel from "@/src/components/chat-panel";

const STORAGE_KEY = "drawio-demo-diagram";

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

const buttonClass =
  "inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700";

export default function DrawIoEditor() {
  const drawioRef = useRef<DrawIoEmbedRef>(null);

  const [xml, setXml] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [previewFormat, setPreviewFormat] = useState<ExportFormat>("xmlsvg");
  const [status, setStatus] = useState("正在加载 draw.io 编辑器…");

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
    drawioRef.current?.load({ xml: saved });
    setStatus("已从 localStorage 加载图表");
  }, []);

  const handleClear = useCallback(() => {
    setPreview(null);
    setXml("");
    drawioRef.current?.load({ xml: "" });
    setStatus("已清空画布");
  }, []);

  return (
    <div className="flex h-dvh flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mr-auto text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Draw.io 编辑器
        </h1>
        <button
          type="button"
          className={buttonClass}
          onClick={() => handleExport("xmlsvg")}
        >
          导出 SVG
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => handleExport("png")}
        >
          导出 PNG
        </button>
        <button type="button" className={buttonClass} onClick={handleSaveLocal}>
          保存
        </button>
        <button type="button" className={buttonClass} onClick={handleLoadLocal}>
          加载
        </button>
        <button type="button" className={buttonClass} onClick={handleClear}>
          清空
        </button>
      </header>

      <main className="relative flex min-h-0 flex-1 gap-3 p-3">
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800">
          <DrawIoEmbed
            ref={drawioRef}
            autosave
            configuration={{ css: DRAWIO_UI_CSS }}
            urlParameters={{
              ui: "kennedy",
              spin: true,
              libraries: true,
              saveAndExit: false,
              lang: "zh",
            }}
            onLoad={() => setStatus("编辑器加载完成，开始绘图吧")}
            onAutoSave={handleAutoSave}
            onExport={handleExported}
            onClose={(data) =>
              setStatus(
                data.parentEvent === "save" ? "图表已保存" : "已退出编辑器",
              )
            }
          />
        </div>

        {preview && (
          <aside className="hidden w-80 shrink-0 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm lg:flex dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                导出预览（{previewFormat === "png" ? "PNG" : "SVG"}）
              </span>
              <button
                type="button"
                className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                onClick={() => setPreview(null)}
              >
                关闭
              </button>
            </div>
            <div className="flex flex-1 items-center justify-center overflow-auto bg-[repeating-conic-gradient(#f4f4f5_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px] p-3 dark:bg-none dark:bg-zinc-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="导出的图表预览"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </aside>
        )}

        <ChatPanel />
      </main>

      <footer className="border-t border-zinc-200 bg-white px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        {status}
      </footer>
    </div>
  );
}
