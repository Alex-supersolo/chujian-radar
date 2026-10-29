# 部署指南

本文档帮助你 **5 分钟**把「初见雷达」部署到线上（免费）。

## 一、准备工作

1. **GitHub 账号**（托管前端）
2. **Cloudflare 账号**（放 API Key，免费、不用绑卡） 
3. **阿里云账号**（调用视觉模型，需实名认证）

---

## 二、拿 API Key

1. 打开 https://bailian.console.aliyun.com/
2. 左侧「API-KEY 管理」→ 创建，复制 `sk-xxxxx`
3. 左侧「模型广场」→ 搜 `qwen3-vl-plus` → 点「开通」（必须开通，否则调用会报 403）

---

## 三、部署 Cloudflare Worker（5 分钟）

### 为什么要 Worker？

GitHub Pages 只能托管静态文件，任何写进前端代码的 API Key 都会暴露。Worker 把 Key 藏在服务端环境变量里，前端只调用 Worker 的公开 URL。

### 操作步骤

1. 打开 https://dash.cloudflare.com/ （没账号就注册一个，不用绑卡）
2. 左侧 Workers & Pages → Create → Create Worker
3. 随便起个名字（如 `chujian-radar`），点 Create
4. 点 **Edit Code**，删除默认代码，把下面这段粘贴进去：

```javascript
// 完整代码在：https://github.com/Alex-supersolo/chujian-radar/blob/main/_backend/cloudflare-and-fc/worker.js
// 或者打开仓库，复制 _backend/cloudflare-and-fc/worker.js 的全部内容
```

5. 点 **Save and Deploy**
6. 回到 Worker 页面，点 **Settings** → Variables → Add variable：
   - Name: `DASHSCOPE_API_KEY`
   - Value: 你的 `sk-xxxxx`
   - Type: **Encrypt**（勾选）
7. 点 **Save**
8. 回到 Worker 概览页，复制顶部的 URL（类似 `https://chujian-radar.你的账号.workers.dev`）

**✅ Worker 部署完成，记住这个 URL。**

---

## 四、部署前端到 GitHub Pages（3 分钟）

### 方式一：用 GitHub CLI（推荐）

```bash
# 1. 克隆仓库
git clone https://github.com/Alex-supersolo/chujian-radar.git
cd chujian-radar

# 2. 编辑 config.js
# 把 apiBase: "" 改成 apiBase: "https://你的worker地址"

# 3. 提交并推送
git add config.js
git commit -m "config: 配置 Worker 地址"
git push

# 4. 开启 Pages
gh api -X POST "repos/你的用户名/chujian-radar/pages" -f source[branch]=main -f source[path]=/

# 等 1-2 分钟，访问：https://你的用户名.github.io/chujian-radar/
```

### 方式二：网页操作

1. 打开 https://github.com/Alex-supersolo/chujian-radar ，点右上角 **Fork**
2. 进入你 Fork 的仓库，点 `config.js`，点右上角编辑按钮（铅笔图标）
3. 把第 12 行 `apiBase: ""` 改成 `apiBase: "https://你的worker地址"`
4. 点 **Commit changes**
5. 进入仓库 Settings → Pages → Source 选 `main` 分支，目录选 `/`（根目录），点 Save
6. 等 1-2 分钟，页面顶部会出现绿色提示「Your site is live at https://xxx.github.io/chujian-radar/」

**✅ 部署完成，点链接访问。**

---

## 五、测试

1. 打开你的 GitHub Pages 地址
2. 上传一张照片（光线均匀、正面、能看清五官）
3. 答完七道题
4. 点「看陌生人对你的第一判断」
5. 等 10-15 秒，报告出来了 ✅

如果报错：
- 打开浏览器开发者工具（F12）→ Console
- 看具体错误信息，对照下面常见问题

---

## 六、常见问题

### 1. 点「分析」一直在演示模式？

**原因**：`config.js` 里的 `apiBase` 没填，或者填错了。

**解法**：
1. 打开浏览器 F12 → Console，看有没有报错
2. 如果看到 `连不上分析服务` → 检查 `apiBase` 是不是 Worker 的 URL（不要带结尾斜杠）
3. 确认 Worker 已部署成功：直接访问 Worker URL，应该返回 `{"ok":true,"service":"初见雷达"}`

### 2. Worker 报 403 Access denied？

**原因**：模型 `qwen3-vl-plus` 没开通。

**解法**：
1. 打开 https://bailian.console.aliyun.com/
2. 左侧「模型广场」→ 搜 `qwen3-vl-plus` → 点「开通」
3. 等几分钟，再试一次

### 3. Worker 报 401 Unauthorized？

**原因**：API Key 配错了。

**解法**：
1. 回到 Cloudflare Worker → Settings → Variables
2. 编辑 `DASHSCOPE_API_KEY`，重新粘贴 Key（前面有 `sk-`）
3. 确认勾选了 **Encrypt**
4. 点 Save

### 4. CORS 错误？

**原因**：Worker 的 `ALLOW_ORIGIN` 没设对（默认是 `*`，允许所有域名）。

**解法**（仅在你想限制来源时需要）：
1. Worker → Settings → Variables → Add variable
2. Name: `ALLOW_ORIGIN`
3. Value: `https://你的用户名.github.io`
4. Save

---

## 七、成本

| 项目 | 免费额度 | 超出后 |
|---|---|---|
| **GitHub Pages** | 100 GB 流量/月 | 够用 |
| **Cloudflare Worker** | 每天 10 万次请求 | 够用 |
| **阿里云 qwen3-vl-plus** | 按量付费，约 ¥0.008/次 | 1000 次约 ¥8 |

**结论**：部署免费，AI 调用才花钱。测试阶段几块钱够了。

---

## 八、备选方案：用阿里云函数计算（国内用户推荐）

Cloudflare Worker 的 `*.workers.dev` 域名在国内部分网络可能不稳。如果用户主要在国内，用阿里云函数计算（FC）。

### 步骤

```bash
# 1. 装 Serverless Devs
npm i -g @serverless-devs/s

# 2. 配置阿里云账号
s config add
# 输入你的 AccessKey ID 和 Secret

# 3. 创建配置文件
cd chujian-radar
cat > s.yaml <<'YAML'
edition: 3.0.0
name: chujian-radar
access: default

resources:
  chujian_api:
    component: fc3
    props:
      region: cn-beijing
      functionName: chujian-analyze
      description: 初见雷达 AI 分析接口
      runtime: nodejs20
      code: ./_backend/cloudflare-and-fc
      handler: fc_handler.handler
      memorySize: 512
      timeout: 60
      environmentVariables:
        DASHSCOPE_API_KEY: ${env(DASHSCOPE_API_KEY)}
        DASHSCOPE_MODEL: qwen3-vl-plus
        ALLOW_ORIGIN: "*"
      triggers:
        - triggerType: http
          triggerName: httpTrigger
          triggerConfig:
            methods:
              - POST
              - OPTIONS
            authType: anonymous
YAML

# 4. 部署
export DASHSCOPE_API_KEY="sk-你的key"
s deploy

# 输出类似：
# https://xxxx-xxxxxxx.cn-beijing.fcapp.run
```

记住这个 URL，填进 `config.js` 的 `apiBase`。

---

## 九、下一步

- 改一下 `questions.js` 里的七道题（换成更准的问法）
- 改一下 `style.css` 的配色（根目录的 CSS 变量）
- 加一个「和朋友对比」功能（见 DESIGN.md 最后一节）

有问题提 Issue：https://github.com/Alex-supersolo/chujian-radar/issues
