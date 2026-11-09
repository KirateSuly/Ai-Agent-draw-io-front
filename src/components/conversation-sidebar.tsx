"use client";

import { useState, type KeyboardEvent } from "react";

import {
  ChatIcon,
  ChevronLeftIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/src/components/icons";
import type { ConversationBookmark } from "@/src/types/conversation";

interface ConversationSidebarProps {
  conversations: ConversationBookmark[];
  activeConversationId: string | null;
  disabled?: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onCollapse: () => void;
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function formatUpdatedAt(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * 左侧历史对话：每条记录保存对话内容与对应的 draw.io 画布。
 * 新建/更新/最近打开的记录会被父组件移动到列表顶部。
 */
export default function ConversationSidebar({
  conversations,
  activeConversationId,
  disabled = false,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onCollapse,
}: ConversationSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const startEditing = (conversation: ConversationBookmark) => {
    if (disabled) {
      return;
    }
    setEditingId(conversation.id);
    setEditingTitle(conversation.title || "新对话");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  const commitEditing = () => {
    if (!editingId) {
      return;
    }
    const title = editingTitle.replace(/\s+/g, " ").trim();
    if (!title) {
      return;
    }
    onRename(editingId, title);
    cancelEditing();
  };

  const handleEditingKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
      return;
    }
    if (event.key === "Enter") {
      // 中文输入法组合输入时按 Enter 是确认候选词，不应提交名称。
      if (event.nativeEvent.isComposing) {
        return;
      }
      event.preventDefault();
      commitEditing();
    }
  };

  return (
    <aside
      aria-label="历史对话"
      className="panel hidden w-56 shrink-0 flex-col overflow-hidden rounded-xl xl:flex"
    >
      <div className="flex items-center gap-2.5 border-b border-line px-3 py-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand ring-1 ring-brand-border">
          <ChatIcon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">
            历史对话
          </h2>
          <p className="text-[10px] text-muted">
            {conversations.length} 个对话
          </p>
        </div>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="收起历史对话"
          title="收起历史对话"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={onCreate}
        disabled={disabled}
        title={disabled ? "回复生成中，暂不能新建对话" : "新建对话"}
        className="mx-2 mt-2 inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand-strong px-3 text-xs font-medium text-white shadow-[0_8px_18px_-12px_rgba(37,99,235,0.9)] transition-all hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50"
      >
        <PlusIcon className="size-4" />
        新建对话
      </button>

      <ul className="thin-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2 py-2.5">
        {conversations.map((conversation) => {
          const active = conversation.id === activeConversationId;
          const messageCount = conversation.messages.length;
          const title = conversation.title || "新对话";
          const editing = editingId === conversation.id;

          return (
            <li key={conversation.id}>
              <div
                className={`group relative rounded-lg border transition-colors ${
                  active
                    ? "border-brand-border bg-brand-soft"
                    : "border-transparent hover:border-line hover:bg-surface-muted"
                }`}
              >
                {editing ? (
                  <div className="rounded-lg px-2 py-2">
                    <label className="sr-only" htmlFor={`rename-${conversation.id}`}>
                      重命名历史对话
                    </label>
                    <input
                      id={`rename-${conversation.id}`}
                      type="text"
                      value={editingTitle}
                      onChange={(event) => setEditingTitle(event.target.value)}
                      onKeyDown={handleEditingKeyDown}
                      autoFocus
                      onFocus={(event) => event.currentTarget.select()}
                      maxLength={30}
                      aria-label={`重命名 ${title}`}
                      className="w-full rounded-md border border-brand-border bg-surface px-2 py-1.5 text-xs font-medium text-foreground outline-none ring-brand/20 focus:ring-2"
                    />
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted">
                        Enter 保存 · Esc 取消
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          onClick={commitEditing}
                          disabled={!editingTitle.trim()}
                          className="rounded-md bg-brand-strong px-2 py-0.5 text-[10px] font-medium text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onSelect(conversation.id)}
                      disabled={disabled || active}
                      aria-current={active ? "true" : undefined}
                      title={title}
                      className={`block w-full rounded-lg px-2.5 py-2 pr-14 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                        disabled || active ? "cursor-default" : "cursor-pointer"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span
                          className={`size-1.5 shrink-0 rounded-full ${
                            active ? "bg-brand" : "bg-line-strong"
                          }`}
                          aria-hidden="true"
                        />
                        <span
                          className={`truncate text-xs font-semibold ${
                            active ? "text-brand" : "text-foreground"
                          }`}
                        >
                          {title}
                        </span>
                      </span>

                      <span className="mt-1 flex items-center justify-between gap-2 text-[10px] text-muted">
                        <span>{messageCount} 条消息</span>
                        <span>{formatUpdatedAt(conversation.updatedAt)}</span>
                      </span>

                      <span className="mt-1 flex items-center gap-1 text-[10px] text-muted/80">
                        <span
                          className={`size-1 rounded-full ${
                            conversation.diagramXml
                              ? "bg-success"
                              : "bg-muted/40"
                          }`}
                          aria-hidden="true"
                        />
                        {conversation.diagramXml ? "含画布图表" : "暂无图表"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        startEditing(conversation);
                      }}
                      disabled={disabled}
                      aria-label={`重命名对话 ${title}`}
                      title="重命名对话"
                      className={`absolute right-8 top-1.5 inline-flex size-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-brand-soft hover:text-brand focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-30 group-focus-within:opacity-100 group-hover:opacity-100 ${
                        active ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <PencilIcon className="size-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(conversation.id);
                      }}
                      disabled={disabled}
                      aria-label={`删除对话 ${title}`}
                      title="删除对话"
                      className="absolute right-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-md text-muted opacity-0 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 disabled:cursor-not-allowed disabled:opacity-30 group-focus-within:opacity-100 group-hover:opacity-100 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                    >
                      <TrashIcon className="size-3.5" />
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}

        {conversations.length === 0 ? (
          <li className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-[11px] text-muted">
            还没有历史对话
          </li>
        ) : null}
      </ul>

      <div className="border-t border-line px-3 py-2 text-[10px] leading-relaxed text-muted">
        历史对话与画布自动保存在当前浏览器
      </div>
    </aside>
  );
}
