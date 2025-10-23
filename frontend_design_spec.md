# 声纹识别与语音识别系统 · 前端技术方案与设计指导书

## 0. 概述

本项目旨在在瑞芯微 RK3588 平台上实现一个可实时运行的语音与声纹识别系统。
前端负责音频采集、实时交互展示、用户与日志管理，并需同时兼容：

- RK3588 触摸屏浏览器运行；
- 本地 Mac/PC 浏览器调试环境。

### 0.1 运行环境与兼容性假设

- RK3588 触摸屏使用的浏览器内核基于 Chromium ≥ 102，并启用 `AudioWorklet`、`SharedArrayBuffer` 与 HTTPS/WSS；若任一能力不可用，需要回退至 `MediaRecorder + Web Worker` 实现 16kHz PCM 推流。
- 所有交互需运行在安全上下文（HTTPS）以获取麦克风权限；FastAPI 或前置 Nginx 负责 TLS 证书续签。
- 设备默认横屏分辨率 ≥ 1280×800，DPI≥1.25；UI 需适配横屏/竖屏切换与高 DPI 触控。

---

## 1. 技术栈与结构

| 层    | 技术                        | 说明                      |
| ----- | --------------------------- | ------------------------- |
| 框架  | Vue 3 + Vite                | Composition API + ESM     |
| 状态  | Pinia                       | 模块化全局状态管理        |
| 路由  | Vue Router                  | `/`, `/login`, `/admin/*` |
| UI 库 | Element Plus + Tailwind CSS | Element Plus 负责数据密集组件，Tailwind 负责布局与触控优化 |
| 通信  | Axios + WebSocket           | HTTP 控制、WSS 实时语音流 |
| 语言  | TypeScript                  | 强类型、易维护            |
| 测试  | Vitest + Playwright         | 单元 + 端到端测试         |
| 构建  | Vite                        | 极速热更新与生产构建      |
| 部署  | FastAPI static / nginx      | RK3588 上运行             |

---

## 2. 环境与变量

```bash
VITE_API_BASE=http://localhost:8080
VITE_WS_URL=ws://localhost:8080/ws/stream
VITE_BUILD_TARGET=dev
```

### 2.1 环境文件与配置

- `.env.development`：本地调试用，默认指向本地 FastAPI。
- `.env.production`：RK3588 部署使用，确保 `VITE_API_BASE`/`VITE_WS_URL` 采用 HTTPS/WSS。
- `.env.example`：展示必要变量及默认值；CI/CD 通过秘密管理器注入生产配置。
- 麦克风访问依赖安全上下文，部署时务必提供有效证书。

3. 主要功能模块

实时语音识别展示（MainView）

说话人识别状态显示

指令结构化事件卡片与授权告警

管理后台（用户/声纹/日志）

登录认证、日志导出、系统配置

性能监控与设备自检（延迟、丢帧率、心跳状态）

4. 目录结构
src/
  assets/
  components/
    alerts/AlertBanner.vue
    cards/CommandCard.vue
    cards/ReportCard.vue
    audio/LevelMeter.vue
    header/AppHeader.vue
    footer/AppFooter.vue
  pages/
    MainView.vue
    Login.vue
    admin/Operators.vue
    admin/Logs.vue
  plugins/
    element.ts
  services/
    apiService.ts
    wsService.ts
    audioService.ts
  stores/
    useConnection.ts
    useAsr.ts
    useSpeaker.ts
    useEvents.ts
    useUser.ts
  types/
    events.ts
    api.ts
  config/
    env.ts
  mocks/
    http.ts
    ws.ts
  i18n/
    index.ts
    zh.ts
    en.ts
  styles/
    tailwind.css
    theme.css
  main.ts
  App.vue

5. 核心模块说明
audioService.ts

- 首次加载检测安全上下文、`AudioWorklet` 支持与采样率能力，不满足时回退为 `MediaRecorder + Web Worker`；
- AudioWorkletProcessor 统一输出 16kHz/16-bit PCM mono，帧长 20–30ms，超过 40ms 触发丢帧记录；
- 暴露 `onFrame`, `onLevelChange`, `onStats`（含平均延迟、丢帧率、重连次数）事件，供 UI 与监控使用；
- 网络断开时进入缓冲模式，重连成功后重新发送 `audio.start` 握手并丢弃过期缓冲；
- 提供 `disableWorklet` 配置，便于在极端性能场景手动降级。

wsService.ts

- 建立与 FastAPI 的 WebSocket 长连接，上行二进制音频，下行 JSON 事件；
- 事件分发：`onTranscript`, `onSpeaker`, `onEvent`, `onError`, `onMeta`，统一遵循 `BaseEvent`（含 `sessionId`, `receivedAt`, `latencyMs`）；
- 20 秒心跳（ping/pong），带重连退避策略（1s、3s、5s、10s）及可配置最大重试次数；
- 暴露 `getMetrics()` 接口供性能监控上报。

apiService.ts

- Axios 封装，处理 BaseURL、Token 注入、错误拦截、离线重试；
- 提供 `/api/operators`、`/api/voiceprints/register`、`/api/logs`、`/api/login` 等 CRUD 操作；
- 错误信息统一通过 Toast 展示，并写入系统事件流。

stores

- `useConnection`：管理 WS 状态、当前延迟、重连次数、最近心跳；
- `useAsr`：维护转写列表与选中行，支持增量更新；
- `useSpeaker`：缓存当前说话人、置信度、授权状态；
- `useEvents`：结构化事件队列，支持告警闪烁、日志查询；
- `useUser`：管理员信息、Token 刷新逻辑、权限校验。

所有 Store 必须：

- 使用 TypeScript 接口定义 `State`、`Actions`；
- 提供 `reset()` 方法与全局 `resetStores()`，在登出或会话过期时调用；
- 暴露 `hydrate(snapshot)`/`dehydrate()` 以支撑未来离线或 SSR 场景；
- 对关键衍生数据使用 `computed` 缓存（例如连接延迟标签）。

6. UI 界面与交互逻辑
MainView.vue

顶栏：连接状态、说话人、延迟

中间：实时文字流（转写）、结构化卡片（指令/报告）

底栏：麦克风开关、连接按钮、清屏

未授权告警：红框闪烁 + 提示音

AdminPanel

Operators.vue：操作员管理 + 声纹注册

Logs.vue：事件日志查询、筛选、导出

Login.vue：管理员登录页

UI 设计要点：

- Element Plus 通过自动按需引入（如 `unplugin-vue-components`）减少首屏体积，Tailwind 负责布局、间距、触摸反馈；
- 高频刷新区域（转写流、电平条）使用 CSS GPU 加速，限制每帧 DOM 变更；
- 触摸交互遵循最小 48px 命中区域，提供长按、滑动手势友好提示；
- 文案使用 `i18n` key，支持中英双语；主题切换通过 CSS 变量实现亮/暗模式；
- 管理后台表格采用虚拟滚动/分页策略，兼顾 RK3588 资源限制。

7. WebSocket 消息格式
客户端 -> 服务端
{ "type": "audio.start", "data": { "sampleRate":16000, "format":"PCM16", "channels":1, "sessionId":"uuid" } }
(binary audio chunks)
{ "type": "audio.stop" }

服务端 -> 客户端
{
  "type": "event",
  "data": {
    "type": "command",
    "event": "countdown",
    "params": { "time": "T-10", "action": "continue" },
    "operator": { "role": "指挥员" },
    "authorized": true,
    "timestamp": "2025-10-22T10:30:00Z"
  }
}

TypeScript 类型：

- `BaseEvent<T>`：`{ id: string; type: string; payload: T; sessionId: string; timestamp: string; latencyMs?: number; }`
- `TranscriptEventPayload`：`{ text: string; finalized: boolean; speakerId?: string; }`
- `SpeakerEventPayload`：`{ speakerId: string; confidence: number; authorized: boolean; }`
- `CommandEventPayload`：`{ category: "command" | "report"; event: string; params: Record<string, unknown>; operator: { role: string }; authorized: boolean; }`

8. 设计规范

最小点击区域：≥48px（触摸屏友好）

颜色方案：绿色=正常、红色=告警、黄色=处理中

文字滚动区自动跟随最新消息

支持亮/暗两种主题

支持中英文切换（Vue I18n）

所有 API 错误统一 Toast 提示，并同步记录到系统事件流便于审计

9. 性能与测试

转写流渲染延迟 <100ms

WS 重连自动恢复

音频流丢帧率 <5%

UI 60fps，日志页虚拟滚动

测试框架：

Vitest（单元）

Playwright（端到端）

Mock 服务（src/mocks/）

性能监控与指标：

- `audioService`、`wsService` 收集延迟、丢帧率、重连次数，通过可选 `/api/metrics` 上报；
- 使用 `PerformanceObserver` 监控 FCP、LCP、长任务；对低帧率触发日志提示；
- 页面加载后运行轻量自检：麦克风权限、WS 连通性、ASR/Speaker 数据流。

测试覆盖建议：

- 单元测试：服务层重试策略、Store `reset()`、i18n 切换；
- 组件测试：转写滚动、告警闪烁、电平条动画；
- 端到端：登录 → 主界面 → 音频推流 → 告警 → 日志导出；
- 性能基准：录制 60s 实测场景，确保渲染延迟 <100ms、帧丢失 <5%。

10. 部署指南

Mac 调试：

npm i
npm run dev
# 访问 http://localhost:5173


RK3588 部署：

npm run build
# 复制 dist/ 到 RK3588
# FastAPI:
# app.mount("/", StaticFiles(directory="dist", html=True))

部署要求：

- `vite.config.ts` 设置 `build.target = "es2019"`，并通过 `manualChunks` 拆分 Element Plus、vendor 依赖；
- 额外提供 `npm run build:rk3588` 命令，禁用 SourceMap、启用 gzip/brotli 压缩；
- FastAPI/Nginx 需启用 HTTPS，静态资源附加 `Cache-Control: public, max-age=31536000`，并通过哈希文件名进行缓存治理；
- 部署脚本负责同步 `.env.production`、重启后端并清理旧 `dist`，同时执行页面健康检查（麦克风权限 + WS 心跳）；
- 设备端允许离线缓存时，使用 Service Worker 仅缓存静态资源，实时数据仍通过 WS。

11. 阶段计划

1️⃣ 初始化项目结构
2️⃣ 配置 UI 栈（Tailwind + Element Plus 按需引入）
3️⃣ 实现 audioService 与 wsService（含监控指标）
4️⃣ 完成 Pinia Store 与类型定义
5️⃣ 实现 MainView 实时交互与可视化组件
6️⃣ 实现 AdminPanel 与日志导出
7️⃣ 优化主题、性能与多语言体验
8️⃣ 构建部署流程并上线至 RK3588（含自动巡检）
9️⃣ 建立性能监控、测试回归与用户反馈循环
```
