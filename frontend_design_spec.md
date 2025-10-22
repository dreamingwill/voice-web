# 声纹识别与语音识别系统 · 前端技术方案与设计指导书

## 0. 概述

本项目旨在在瑞芯微 RK3588 平台上实现一个可实时运行的语音与声纹识别系统。
前端负责音频采集、实时交互展示、用户与日志管理，并需同时兼容：

- RK3588 触摸屏浏览器运行；
- 本地 Mac/PC 浏览器调试环境。

---

## 1. 技术栈与结构

| 层    | 技术                        | 说明                      |
| ----- | --------------------------- | ------------------------- |
| 框架  | Vue 3 + Vite                | Composition API + ESM     |
| 状态  | Pinia                       | 模块化全局状态管理        |
| 路由  | Vue Router                  | `/`, `/login`, `/admin/*` |
| UI 库 | Element Plus + Tailwind CSS | 支持触屏与响应式布局      |
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

3. 主要功能模块

实时语音识别展示（MainView）

说话人识别状态显示

指令结构化事件卡片与授权告警

管理后台（用户/声纹/日志）

登录认证、日志导出、系统配置

4. 目录结构
src/
  assets/
  components/
    alerts/AlertBanner.vue
    cards/CommandCard.vue
    cards/ReportCard.vue
    header/AppHeader.vue
    footer/AppFooter.vue
  pages/
    MainView.vue
    Login.vue
    admin/Operators.vue
    admin/Logs.vue
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
  mocks/
    http.ts
    ws.ts
  i18n/
    index.ts
    zh.ts
    en.ts
  styles/
    tailwind.css
  main.ts
  App.vue

5. 核心模块说明
audioService.ts

使用 Web Audio API + AudioWorklet

输出 16kHz/16-bit PCM mono

每 20–40ms 发送音频帧

断网自动重连、丢帧保护

UI 可视化电平条

wsService.ts

与 FastAPI 建立 WebSocket 长连接

二进制上行（音频），JSON 下行（识别结果）

支持事件分发：onTranscript, onSpeaker, onEvent, onError, onMeta

心跳机制（ping/pong，每20秒）

自动重连与状态上报

apiService.ts

Axios 封装：BaseURL、token 注入、错误处理

实现：

/api/operators CRUD

/api/voiceprints/register

/api/logs

/api/login

stores

useConnection：WS 状态、延迟、sessionId

useAsr：转写文本列表

useSpeaker：当前说话人信息

useEvents：结构化事件列表

useUser：管理员登录状态与 Token

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

8. 设计规范

最小点击区域：≥48px（触摸屏友好）

颜色方案：绿色=正常、红色=告警、黄色=处理中

文字滚动区自动跟随最新消息

支持亮/暗两种主题

支持中英文切换（Vue I18n）

所有 API 错误统一 Toast 提示

9. 性能与测试

转写流渲染延迟 <100ms

WS 重连自动恢复

音频流丢帧率 <5%

UI 60fps，日志页虚拟滚动

测试框架：

Vitest（单元）

Playwright（端到端）

Mock 服务（src/mocks/）

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

11. 阶段计划

1️⃣ 初始化项目结构
2️⃣ 实现 audioService 与 wsService
3️⃣ 实现 MainView 实时交互
4️⃣ 实现 AdminPanel
5️⃣ 优化主题与性能
6️⃣ 部署到 RK3588 触摸屏
```
