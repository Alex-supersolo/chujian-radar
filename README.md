# 初见雷达 · 你给陌生人的第一印象

> **一句话**：上传照片 + 七题自评 → 看见「陌生人在 3 秒内对你下的 7 个判断」，以及你理解的自己和别人读到的你之间那道落差。

![](https://img.shields.io/badge/AI-qwen3--vl--plus-blue) ![](https://img.shields.io/badge/deploy-GitHub%20Pages-green) ![](https://img.shields.io/badge/license-MIT-orange)

**在线演示（演示模式，不调用 AI）**：https://alex-supersolo.github.io/chujian-radar/

**部署指南**：[README_ZH_DEPLOY.md](./README_ZH_DEPLOY.md)

---

## 产品逻辑

核心不是评价颜值，而是**模拟陌生人的第一眼读法**，并翻译成可执行的场景建议。

| 你做的是… | 常规打分产品做的是… |
|---|---|
| 把别人对你的误读翻译出来 | 给你打个总分 |
| 落差指数（你理解的自己 vs 别人读到的你）| 单维度排名 |
| 七个维度（可信度、亲和度、攻击性、气场、松弛感、记忆点、专业度）| 美丑评分 |
| 具体到面部依据（眉骨、唇线、眼窝阴影）+ 场景翻译（职场、约会、镜头）| 泛泛的评价 |
| 所有负面指向「别人的默认读法」，不指向五官本身 | "你的鼻子偏宽" |
| 提供三个不动刀的调整（当天可做、零成本）| 建议医美 |

**核心防线**：
- 不评价美丑、不给总分
- 不提医美、整容、年龄、体重、种族
- 疑似未成年人直接拒绝
- 照片不落盘、不存库，只在内存中转发给模型

---

## 快速开始

### 本地开发（5 分钟）

\`\`\`bash
# 1. 克隆仓库
git clone https://github.com/Alex-supersolo/chujian-radar.git
cd chujian-radar

# 2. 配置 API Key
cp .env.example .env
# 编辑 .env，填入你的 DASHSCOPE_API_KEY（见下方）

# 3. 启动
node _backend/server.mjs

# 访问 http://localhost:5173
\`\`\`

**拿 API Key**：
1. 打开 https://bailian.console.aliyun.com/ （需实名认证）
2. 左侧「API-KEY 管理」→ 创建，复制 \`sk-xxxxx\`
3. 左侧「模型广场」→ 搜 \`qwen3-vl-plus\` → 点「开通」

### 部署到线上（免费）

详见 **[部署指南](./README_ZH_DEPLOY.md)**，5 分钟搞定：
- 前端 → GitHub Pages
- API → Cloudflare Worker（或阿里云函数计算）

---

## 技术栈

| 层 | 技术 |
|---|---|
| **前端** | 纯 HTML/CSS/JS，无框架，hash 路由 |
| **后端** | Node.js 本地开发服务器 |
| **生产 API** | Cloudflare Worker / 阿里云函数计算 |
| **AI 模型** | 通义千问 qwen3-vl-plus 多模态视觉模型 |
| **部署** | GitHub Pages（前端） + Worker/FC（API） |

**为什么分两层**：GitHub Pages 只能托管静态文件，任何写进前端代码的 API Key 都会暴露。Worker/FC 把 Key 藏在服务端环境变量里。

---

## 常见问题

查看 [README_ZH_DEPLOY.md](./README_ZH_DEPLOY.md) 的「常见问题」章节。

---

## License

MIT License. 随便改。如果你在这个基础上做出了更好的版本，欢迎提 PR。
