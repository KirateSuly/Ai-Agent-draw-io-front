import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthLoading from "@/src/components/auth-loading";
import LoginForm from "@/src/components/login-form";
import {
  decodeCookieValue,
  isValidUserId,
  USER_ID_COOKIE,
} from "@/src/utils/cookie";

export const metadata: Metadata = {
  title: "登录 · AI 绘图工作台",
  description: "登录后使用 AI 智能体生成 draw.io 图表",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthLoading label="正在加载登录页…" />}>
      <LoginGate />
    </Suspense>
  );
}

async function LoginGate() {
  const cookieStore = await cookies();
  const userId = decodeCookieValue(cookieStore.get(USER_ID_COOKIE)?.value);

  if (isValidUserId(userId)) {
    redirect("/");
  }

  return <LoginForm />;
}
