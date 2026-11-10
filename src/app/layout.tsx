import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Draw.io 编辑器",
  description: "基于 react-drawio 的在线图表编辑器",
  // draw.io 的 embed.diagrams.net 会拒绝 Referer 为公网 IP 的请求（403）。
  // 用 IP 访问部署环境时，iframe 会带上 http://<ip>:3000/，导致编辑器加载失败。
  // same-origin：同源请求仍带 Referer，跨域请求（draw.io iframe）不带。
  referrer: "same-origin",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
