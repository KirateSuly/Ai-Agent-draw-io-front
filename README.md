This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## draw.io 嵌入地址

默认使用官方地址 `https://embed.diagrams.net`。如果所在网络无法访问该域名，可以自建 draw.io 服务并配置：

```bash
NEXT_PUBLIC_DRAWIO_BASE_URL=https://your-drawio-host
```

修改后需重启开发服务器。页面在加载超时后会显示提示和“重新加载”按钮。

## 后端 API

前端默认请求 `http://127.0.0.1:8091/api/v1`，可通过环境变量指定后端根地址（末尾不要带斜杠）：

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8091
```

登录页为 `/login`，登录成功后用户 ID 写入 Cookie 并进入工作台 `/`。工作台会依次调用：

- `GET /query_ai_agent_config_list`：加载智能体列表
- `POST /create_session`：首次发送消息时创建会话
- `POST /chat`：发送消息并获取 draw.io XML，解析后渲染到左侧画布

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
