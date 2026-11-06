import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthLoading from "@/src/components/auth-loading";
import DrawIoEditor from "@/src/components/drawio-editor";
import {
  decodeCookieValue,
  isValidUserId,
  USER_ID_COOKIE,
} from "@/src/utils/cookie";

export default function Home() {
  return (
    <Suspense fallback={<AuthLoading label="正在验证登录状态…" />}>
      <AuthenticatedWorkbench />
    </Suspense>
  );
}

async function AuthenticatedWorkbench() {
  const cookieStore = await cookies();
  const userId = decodeCookieValue(cookieStore.get(USER_ID_COOKIE)?.value);

  if (!isValidUserId(userId)) {
    redirect("/login");
  }

  return <DrawIoEditor userId={userId} />;
}
