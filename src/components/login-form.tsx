"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { ArrowRightIcon, DiagramIcon } from "@/src/components/icons";
import { setUserId, validateUserId } from "@/src/utils/cookie";

export default function LoginForm() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
    if (error) {
      setError("");
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) {
      return;
    }

    const result = validateUserId(value);
    if (!result.ok) {
      setError(result.message);
      inputRef.current?.focus();
      return;
    }

    if (!setUserId(result.value)) {
      setError("无法写入登录 Cookie，请检查浏览器设置");
      return;
    }

    setSubmitting(true);
    window.location.replace("/");
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-brand-strong text-white shadow-[0_12px_28px_-12px_rgba(37,99,235,0.9)]">
            <DiagramIcon className="size-6" />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">
              AI 绘图工作台
            </p>
            <p className="mt-0.5 text-[11px] text-muted">
              Draw.io · Agent
            </p>
          </div>
        </div>

        <div className="panel rounded-2xl p-6 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            欢迎回来
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            输入用户 ID，开始与智能体对话并生成图表
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label
                htmlFor="userId"
                className="mb-1.5 block text-xs font-medium text-muted-strong"
              >
                用户 ID
              </label>
              <input
                ref={inputRef}
                id="userId"
                name="userId"
                type="text"
                maxLength={32}
                autoComplete="username"
                autoFocus
                spellCheck={false}
                placeholder="例如：KirateSuly"
                value={value}
                onChange={handleChange}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error" : undefined}
                className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted/60 focus:border-brand-border focus:ring-4 focus:ring-brand/10"
              />
            </div>

            {error ? (
              <p
                id="login-error"
                role="alert"
                className="rounded-lg bg-rose-50 px-3 py-2 text-xs leading-relaxed text-rose-600 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-strong text-sm font-medium text-white shadow-[0_12px_26px_-14px_rgba(37,99,235,0.95)] transition-all hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "正在进入…" : "进入工作台"}
              <ArrowRightIcon className="size-4" />
            </button>
          </form>

          <p className="mt-5 border-t border-line pt-4 text-center text-[11px] leading-relaxed text-muted">
            演示登录：不校验密码；用户 ID 将用于创建会话与发起对话
          </p>
        </div>

        <p className="mt-5 text-center text-[11px] text-muted/70">
          AI Agent · draw.io diagram workspace
        </p>
      </div>
    </div>
  );
}
