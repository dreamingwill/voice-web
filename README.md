# Speak Voice Web 控制台

多语言实时语音接入与运营管理前端，基于 Vue 3、Pinia、Vue Router 与 Element Plus 构建。项目提供麦克风采集、转写流展示、结构化事件提醒，以及操作员与日志的后台管理能力，可对接后端 ASR/LLM 服务与运营 API。

## 功能亮点
- 实时麦克风录音、静音与采集状态反馈，音频帧通过 WebSocket (`VITE_WS_URL`) 推送至后端。
- 转写流按时间倒序显示，可区分草稿/最终文本，并支持一键清空。
- 指令/报告等结构化事件以卡片形式呈现，并在敏感事件时触发头部告警。
- 操作员管理页面支持搜索、分页、启禁用、声纹登记弹窗等常用运营操作。
- 登录态持久化，支持基于 JWT/Bearer Token 的 API 访问 (`VITE_API_BASE`)。

## 环境要求
- Node.js ≥ 18（推荐 20 LTS，确保兼容 Vite 5 与 rolldown）。
- npm 10+（仓库附带 `package-lock.json`，建议使用 npm 安装以避免版本偏差）。
- 已就绪的后端：
  - REST API（登录接口默认为 `POST ${VITE_API_BASE}/api/auth/login`，其余资源同 `/api/**` 命名）。
  - WebSocket 实时通道（默认 `ws://localhost:8000/ws/asr`）。

## 从下载到运行
1. **下载源码**
   ```bash
   git clone <repo-url>
   cd voice-web/vite-project
   ```
2. **安装依赖**
   ```bash
   npm install
   # 如在 CI/全新环境，可使用 npm ci 获得锁定依赖
   ```
3. **配置环境变量**（在 `vite-project` 下创建 `.env.local`）
   ```bash
   # .env.local
   VITE_API_BASE=http://localhost:8000/      # REST API 根路径，末尾保留 /
   VITE_WS_URL=ws://localhost:8000/ws/asr    # 实时语音 WebSocket
   ```
4. **启动开发服务器**
   ```bash
   npm run dev
   ```
   默认监听 `http://localhost:5173`，首次进入页面请允许浏览器的麦克风权限。
5. **登录并体验**
   - 开发示例账号：`admin / voice123`（见 `src/pages/Login.vue`）。生产环境请对接真实身份体系。
   - 登录成功后进入主工作台，可执行以下操作：
     1. 点击“开始采集”授权麦克风，与后端建立音频和 WebSocket 双通道。
     2. 使用“静音/取消静音”、“停止采集”控制音频流；状态提示会显示在卡片底部。
     3. 在“实时转写流”中查看语音转写，草稿为灰色斜体，最终文本为深色。
     4. 在“结构化事件”区域查看命令/报告卡片，并通过“清空”维护视图。
     5. 进入“操作员与声纹管理”“日志审计”等后台页面完成日常任务。

## 构建与发布
```bash
npm run build    # 生成 dist 静态资源
npm run preview  # 本地以生产构建结果启动，只读验证
```
将 `dist` 目录部署到任意静态站点（Nginx、CDN、Serverless 等），并确保反向代理正确转发 REST API 与 WebSocket。

## 常见问题
- **麦克风无法启动**：确认浏览器已授权，且系统没有其它独占麦克风的程序；控制台的 Element Plus 提示中会显示失败原因。
- **登录一直失败**：检查 `.env.local` 中 `VITE_API_BASE` 是否指向可访问的后端，并确认返回 `token` 等字段与 `useUserStore` 期望一致。
- **实时流无数据**：确认 `VITE_WS_URL` 可直连，浏览器网络面板应存在 `ws` 连接；若仅需要静态演示，可以在 `useAudioStore` 中开启 mock（`src/mocks`）。
- **跨域问题**：开发模式下可在后端开启 CORS，或通过 Vite 代理（在 `vite.config.ts` 的 `server.proxy` 中配置）解决。

若需要进一步扩展（多语言、角色权限、CI/CD），可在 `frontend_design_spec.md` 中找到设计背景，也欢迎在 Issue/PR 中讨论。
