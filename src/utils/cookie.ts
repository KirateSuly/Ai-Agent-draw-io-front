import { API_CONFIG } from "@/src/config/api-config";

export const USER_ID_COOKIE = API_CONFIG.cookieKeys.userId;

const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function isBrowser(): boolean {
  return typeof document !== "undefined";
}

/** 写入 Cookie；返回是否写入成功 */
export function setCookie(
  name: string,
  value: string,
  maxAgeSeconds: number = DEFAULT_MAX_AGE_SECONDS,
): boolean {
  if (!isBrowser()) {
    return false;
  }

  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value,
  )}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${secure}`;

  return getCookie(name) === value;
}

/** 读取 Cookie */
export function getCookie(name: string): string | null {
  if (!isBrowser()) {
    return null;
  }

  const encodedName = `${encodeURIComponent(name)}=`;
  const cookies = document.cookie ? document.cookie.split("; ") : [];

  for (const cookie of cookies) {
    if (!cookie.startsWith(encodedName)) {
      continue;
    }
    const rawValue = cookie.slice(encodedName.length);
    return decodeCookieValue(rawValue);
  }

  return null;
}

/** 删除 Cookie */
export function removeCookie(name: string): void {
  if (!isBrowser()) {
    return;
  }
  document.cookie = `${encodeURIComponent(
    name,
  )}=; Max-Age=0; Path=/; SameSite=Lax`;
}

/** 兼容已解码和未解码的 Cookie 值 */
export function decodeCookieValue(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export type UserIdValidation =
  | { ok: true; value: string }
  | { ok: false; message: string };

/** 校验用户 ID，规则与参考登录页保持一致 */
export function validateUserId(raw: string): UserIdValidation {
  const value = String(raw ?? "").trim();

  if (!value) {
    return { ok: false, message: "请输入用户 ID" };
  }
  if (value.length < 2 || value.length > 32) {
    return { ok: false, message: "用户 ID 需为 2–32 个字符" };
  }
  if (!/^[\u4e00-\u9fa5A-Za-z0-9_.@-]+$/.test(value)) {
    return { ok: false, message: "仅支持中英文、数字及 _ . @ -" };
  }

  return { ok: true, value };
}

export function isValidUserId(raw: string): boolean {
  return validateUserId(raw).ok;
}

export function getUserId(): string {
  return (getCookie(USER_ID_COOKIE) ?? "").trim();
}

export function setUserId(userId: string): boolean {
  return setCookie(USER_ID_COOKIE, userId.trim());
}

export function clearUserId(): void {
  removeCookie(USER_ID_COOKIE);
}
