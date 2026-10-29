/* 初见雷达 · 本地开发服务器 + AI 接口
 * 零依赖，只用 Node 内置模块。
 *   启动：node server.mjs
 *   访问：http://localhost:5173
 * 环境变量见 .env.example
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ---------------- 读 .env ---------------- */
function loadEnv() {
  const p = path.join(__dirname, ".env");
  if (!fs.existsSync(p)) return;
  const txt = fs.readFileSync(p, "utf8");
  for (const line of txt.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv();

const PORT = Number(process.env.PORT || 5173);
const API_KEY = process.env.DASHSCOPE_API_KEY || "";
const MODEL = process.env.DASHSCOPE_MODEL || "qwen3-vl-plus";
const BASE = process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
const LIMIT = Number(process.env.RATE_LIMIT || 30);
const MOCK = process.env.MOCK === "1" || !API_KEY;

const DIMS = ["trust", "warmth", "edge", "presence", "composure", "memory", "clarity"];
const DIM_CN = {
  trust: "可信度",
  warmth: "亲和度",
  edge: "攻击性",
  presence: "气场",
  composure: "松弛感",
  memory: "记忆点",
  clarity: "专业度",
};

/* ---------------- 核心提示词 ---------------- */
function buildPrompt(selfScores) {
  const selfDesc = DIMS.map((k) => `${DIM_CN[k]}：${selfScores[k] ?? 50}`).join("\n");

  return `你是一位极准的观察者，专门做一件事：把「一个陌生人在看到这张照片的头 3 秒里，不受控制地生出的判断」如实翻译出来。

游客已经自评了七个维度（0-100，越高代表他认为自己在别人眼里越强）：
${selfDesc}

你的任务不是评价美丑，而是**模拟那个陌生人**。请严格按以下要求输出。

【绝对禁止】
1. 不评价美丑、不给总分、不给颜值评分
2. 不评价身材、体重、年龄、种族、肤色
3. 不提任何医美、整容、填充、手术建议
4. 不给出「你是第几名」这类排名
5. 如果照片里是明显未成年人（看起来不到 18 岁），或不是人脸、多人、严重模糊，只输出：
   {"error":"REFUSE:原因"}
6. 不使用以下词：颜值、好看、漂亮、丑、美女、帅哥

【必须做到】
1. 所有观察必须落到具体的面部依据（眉骨、眼窝、唇线、下颌线、眼睛开合、面部留白、光的落点等），让读者觉得「你真的看了我的照片」
2. 每一条负面都必须：①指向「别人的默认读法」而不是他的五官本身 ②附带可执行的修正动作 ③不造成纯伤害
   反例：「你的鼻子偏宽」
   正例：「你的鼻部在整个面部占比偏大，第一眼会先落到这里，于是别人容易忽略你其实更耐看的上半张脸」
3. 语言克制、具体、像一个说话很准的成年人。禁止抒情、禁止比喻堆砌、禁止「宛如」「仿佛」这类词
4. 每一条断言都必须是可以被反驳的。禁止「你很有魅力」这种无法证伪的话
5. 第二人称「你」
6. 七个维度的分数要根据照片给出真实判断，不要全部堆在 60-75 之间，要有明显的高峰和低洼

【输出格式】
只输出一个 JSON 对象，不要任何解释、不要 markdown 代码块。字段如下：

{
  "headline": "一句 15-30 字的第二人称断言，必须包含落差结构：你以为是「A」，别人读成「B」。A 和 B 都要用「」包住",
  "tags": ["三个 2-4 字的标签，是别人对他的第一印象归类，如「冷感」「高辨识」「稳」"],
  "scores": {
    "trust": 0-100整数, "warmth": 0-100, "edge": 0-100,
    "presence": 0-100, "composure": 0-100, "memory": 0-100, "clarity": 0-100
  },
  "dims": {
    "trust": {"read": "陌生人视角的行为描述，40-70字，写他会怎么做，不是他是什么人", "cost": "这个读法让他损失了什么，25-40字"},
    "warmth": {"read": "...", "cost": "..."},
    "edge": {"read": "...", "cost": "..."},
    "presence": {"read": "...", "cost": "..."},
    "composure": {"read": "...", "cost": "..."},
    "memory": {"read": "...", "cost": "..."},
    "clarity": {"read": "...", "cost": "..."}
  },
  "evidence": [
    "从照片读到的具体面部观察，每条 30-50 字，必须包含可指认的解剖或光位细节。3 到 4 条。"
  ],
  "projection": "解释这道落差为什么会产生，60-100字。核心意思：他按自己最好的状态评估自己，别人按他的默认状态评估他。要具体，不要套话。",
  "gain": "这套读法免费送了他什么红利，40-60字",
  "cost": "它让他付出了什么代价，40-60字。要写得让人心里一动，但不能刻薄",
  "scenes": [
    {"name": "职场初面", "read": "对方会怎么读他，40-70字", "fix": "一个具体可执行的动作，40-70字，不要说「多微笑」这种废话"},
    {"name": "第一次见面", "read": "...", "fix": "..."},
    {"name": "约会", "read": "...", "fix": "..."},
    {"name": "镜头与照片", "read": "...", "fix": "..."}
  ],
  "tweaks": [
    {"title": "6字以内的动作名", "do": "具体做法，30-50字，零成本，当天可做，绝不涉及医美", "why": "为什么有效，涉及一点视觉或生理原理，30-50字"}
  ],
  "closing": "一句可以当签名的短句，15-25字，第二人称，有转折，不给鸡汤感。例：你不需要变得好接近，你需要被对的人认出来。"
}

tweaks 必须是 3 条。scenes 必须是 4 条，name 固定用上面给的四个。
再次强调：只输出 JSON。`;
}

/* ---------------- 调用模型 ---------------- */
async function callModel(imageDataURL, selfScores) {
  const body = {
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "你是一个极其敏锐、语言克制的人类观察者。你只输出合法的 JSON，不输出任何其他内容。",
      },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageDataURL } },
          { type: "text", text: buildPrompt(selfScores) },
        ],
      },
    ],
    temperature: 0.85,
    max_tokens: 2600,
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 75000);

  let res;
  try {
    res = await fetch(BASE + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + API_KEY,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    let hint = "";
    if (res.status === 401) hint = "API Key 无效，检查 DASHSCOPE_API_KEY。";
    else if (res.status === 403) hint = "该模型未开通，去百炼控制台「模型广场」开通 " + MODEL + "。";
    else if (res.status === 404) hint = "模型不存在，检查 DASHSCOPE_MODEL 是否写对。";
    else if (res.status === 429) hint = "调用超限或余额不足。";
    const err = new Error(hint || `模型返回 ${res.status}：${txt.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const text =
    data?.choices?.[0]?.message?.content ??
    data?.output?.choices?.[0]?.message?.content?.content ??
    "";

  return parseJSON(text);
}

/* 模型偶尔会包 ```json，或前后带话，都切出来 */
function parseJSON(raw) {
  if (!raw) throw new Error("模型返回了空内容。");
  let t = String(raw).trim();
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  try {
    return JSON.parse(t);
  } catch (e) {
    throw new Error("模型的返回不是合法 JSON。" + t.slice(0, 120));
  }
}

/* ---------------- 服务端兜底 ---------------- */
const DEF_TXT = "这一项没有读出来。";

function sanitize(j) {
  if (!j || typeof j !== "object") throw new Error("返回数据结构异常。");
  if (j.error) {
    const msg = String(j.error);
    if (msg.startsWith("REFUSE:")) return { error: msg.replace("REFUSE:", "").trim() };
    throw new Error(msg);
  }

  const scores = {};
  for (const k of DIMS) {
    let v = Number(j.scores?.[k]);
    if (!isFinite(v)) v = 50;
    scores[k] = Math.max(0, Math.min(100, Math.round(v)));
  }

  const dims = {};
  for (const k of DIMS) {
    const s = j.dims?.[k] || {};
    dims[k] = {
      read: str(s.read, 260) || DEF_TXT,
      cost: str(s.cost, 200),
    };
  }

  const strs = (a, n, len) =>
    Array.isArray(a)
      ? a.map((x) => str(x, len)).filter(Boolean).slice(0, n)
      : [];

  return {
    headline: str(j.headline, 100) || "你以为是「随便看看」，别人读成「不太好接近」",
    tags: strs(j.tags, 3, 12),
    scores,
    dims,
    evidence: strs(j.evidence, 4, 120),
    projection: str(j.projection, 700),
    gain: str(j.gain, 340),
    cost: str(j.cost, 340),
    scenes: Array.isArray(j.scenes)
      ? j.scenes.slice(0, 4).map((s, i) => ({
          name: str(s?.name, 20) || ["职场初面", "第一次见面", "约会", "镜头与照片"][i] || "场景",
          read: str(s?.read, 320),
          fix: str(s?.fix, 320),
        }))
      : [],
    tweaks: Array.isArray(j.tweaks)
      ? j.tweaks.slice(0, 3).map((t) => ({
          title: str(t?.title, 40),
          do: str(t?.do, 320),
          why: str(t?.why, 280),
        }))
      : [],
    closing: str(j.closing, 140),
  };
}

function str(v, max) {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

/* ---------------- 限流 ---------------- */
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const win = 3600 * 1000;
  const rec = hits.get(ip) || { n: 0, t: now };
  if (now - rec.t > win) {
    rec.n = 0;
    rec.t = now;
  }
  rec.n++;
  hits.set(ip, rec);
  return rec.n > LIMIT;
}

/* ---------------- HTTP ---------------- */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req, limit = 12 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("照片太大，请换一张小一点的。"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
  const pathname = decodeURIComponent(url.pathname);

  // CORS（本地/线上前端分离时用得上）
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  /* ---- API ---- */
  if (pathname === "/api/analyze" && req.method === "POST") {
    const ip =
      (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
      req.socket.remoteAddress ||
      "unknown";

    if (rateLimited(ip)) {
      sendJSON(res, 429, { error: "试的人有点多，歇一会儿再来。" });
      return;
    }

    let payload;
    try {
      payload = JSON.parse(await readBody(req));
    } catch (e) {
      sendJSON(res, 400, { error: e.message || "请求格式不对。" });
      return;
    }

    const { image, selfScores } = payload || {};
    if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
      sendJSON(res, 400, { error: "没有收到有效的图片。" });
      return;
    }
    if (image.length > 10 * 1024 * 1024) {
      sendJSON(res, 413, { error: "照片太大了。" });
      return;
    }

    const self = {};
    for (const k of DIMS) {
      const v = Number(selfScores?.[k]);
      self[k] = isFinite(v) ? Math.max(0, Math.min(100, v)) : 50;
    }

    if (MOCK) {
      // 演示模式：让前端从 app.js 拿示例报告
      sendJSON(res, 503, { error: "服务端处于演示模式（未配置 DASHSCOPE_API_KEY）。" });
      return;
    }

    try {
      const raw = await callModel(image, self);
      const clean = sanitize(raw);
      if (clean.error) {
        sendJSON(res, 422, { error: "这张照片暂时读不了：" + clean.error });
        return;
      }
      sendJSON(res, 200, clean);
    } catch (e) {
      console.error("[analyze]", e.message);
      sendJSON(res, 500, { error: e.message || "分析失败。" });
    }
    return;
  }

  /* ---- 静态 ---- */
  let rel = pathname === "/" ? "/index.html" : pathname;
  if (!path.extname(rel)) rel = "/index.html";

  const filePath = path.join(__dirname, "public", rel);
  const root = path.join(__dirname, "public");

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA 兜底
      fs.readFile(path.join(root, "index.html"), (e2, d2) => {
        if (e2) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(d2);
      });
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log("");
  console.log("  初见雷达  http://localhost:" + PORT);
  console.log("  模型      " + MODEL);
  console.log("  状态      " + (MOCK ? "演示模式（未配置 Key）" : "已连接 DashScope"));
  console.log("");
});
