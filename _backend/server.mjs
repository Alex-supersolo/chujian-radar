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
// 前端在仓库根目录（GitHub Pages 要求），后端在 _backend/
const WEB_ROOT = path.resolve(__dirname, "..");

/* ---------------- 读 .env ---------------- */
function loadEnv() {
  // 先找 _backend/.env，再找仓库根 .env
  const candidates = [path.join(__dirname, ".env"), path.join(WEB_ROOT, ".env")];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
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
    break;
  }
}
loadEnv();

const PORT = Number(process.env.PORT || 5173);
const API_KEY = process.env.DASHSCOPE_API_KEY || "";
const MODEL = process.env.DASHSCOPE_MODEL || "qwen3.8-max";
const BASE = process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
const LIMIT = Number(process.env.RATE_LIMIT || 30);
const MOCK = process.env.MOCK === "1" || !API_KEY;

const DIMS = ["distance", "warmth", "trust", "presence", "chat", "memory", "boundary"];
const DIM_CN = {
  distance: "距离感",
  warmth: "亲和力",
  trust: "靠谱感",
  presence: "存在感",
  chat: "好聊感",
  memory: "记忆点",
  boundary: "边界感",
};

/* ---------------- 核心提示词 ---------------- */
function buildPrompt() { return "你是「初见雷达」的社交观察员。你的任务是模拟：一个中国成年人第一次在饭局、工作群、朋友介绍、课堂、公司或约会中看到用户照片时，脑子里可能先闪过的印象。\n\n这不是颜值评分，也不是照片风格分析。请输出一个有趣、具体、让人想发给朋友讨论的「第一印象画像」。\n\n只能根据照片里可见的表情、姿态、穿着、构图和整体视觉信号做娱乐性模拟。不能断言陌生人的真实想法，不能从脸推断人格、智力、收入、职业能力、道德、心理疾病、恋爱经历或可信度。不要评价美丑、年龄、身材、种族、皮肤、五官缺陷，不给医美建议。\n\n本土语境要自然使用这些场景：饭局第一次见面、朋友带朋友、公司新人、工作群头像、同学聚会、相亲/约会开场、排队或电梯偶遇。文案要像朋友在背后描述一个人，轻松、准确、有一点调侃，但不能刻薄。禁止使用傻、蠢、丑、土、油腻、难搞、神经质、心机、没情商等贬损或贴人格缺陷的词；可以说“看起来有距离”“开场慢”“有点酷”，但必须给用户留面子。\n\n七个维度：distance=距离感，warmth=亲和力，trust=靠谱感，presence=存在感，chat=好聊感，memory=记忆点，boundary=边界感。分数只是娱乐刻度，不是科学测量。\n\n重要：headline 必须是能让用户截图的反差句，例如「你以为自己很普通，别人先记住了你的不好惹」或「第一眼有点冷，聊两句就暴露了你的好相处」。不要固定使用“别人读成”，避免像机器模板。\n\n只输出合法 JSON，不要 markdown：\n{\n\"headline\":\"15-28字，有反差、有画面感的第一印象句\",\n\"tags\":[\"2-5字社交标签\",\"标签\",\"标签\"],\n\"typeName\":\"一个可传播的类型名，例如慢热型显眼包、礼貌型距离感、低调的记忆点、看着难聊其实很有梗\",\n\"typeDesc\":\"40-70字，解释这种类型在中国日常社交里的表现\",\n\"firstThought\":\"50-90字，写陌生人第一眼可能产生的内心旁白，必须带饭局/群聊/朋友介绍等具体画面\",\n\"misread\":\"25-55字，一句朋友可能说的‘我第一次以为你……后来才发现……’\",\n\"scores\":{\"distance\":0,\"warmth\":0,\"trust\":0,\"presence\":0,\"chat\":0,\"memory\":0,\"boundary\":0},\n\"dims\":{\n\"distance\":{\"read\":\"30-55字：陌生人会不会主动靠近、怎么开场\",\"cost\":\"20-35字：可能造成的社交误会\"},\n\"warmth\":{\"read\":\"30-55字：别人会不会愿意接话\",\"cost\":\"20-35字：可能造成的误会\"},\n\"trust\":{\"read\":\"30-55字：第一次合作或加微信时的感觉\",\"cost\":\"20-35字：可能造成的误会\"},\n\"presence\":{\"read\":\"30-55字：进饭局、会议或群聊时的存在感\",\"cost\":\"20-35字：可能造成的误会\"},\n\"chat\":{\"read\":\"30-55字：别人是否想继续和你聊\",\"cost\":\"20-35字：可能造成的误会\"},\n\"memory\":{\"read\":\"30-55字：见过后是否容易记得\",\"cost\":\"20-35字：可能造成的误会\"},\n\"boundary\":{\"read\":\"30-55字：别人感受到的分寸感\",\"cost\":\"20-35字：可能造成的误会\"}\n},\n\"evidence\":[\"30-55字，照片中可见信号如何影响第一印象\",\"30-55字，照片中可见信号如何影响第一印象\",\"30-55字，照片中可见信号如何影响第一印象\"],\n\"projection\":\"50-90字，只解释为什么一张照片和真实相处会不同，不要说用户自我认知错误\",\n\"gain\":\"35-60字，写这种第一印象带来的社交红利\",\n\"cost\":\"35-60字，写这种第一印象可能让用户错过什么，但要可承受\",\n\"scenes\":[\n{\"name\":\"饭局第一次见面\",\"read\":\"40-70字，写别人怎么给你安排座位、怎么开第一句\",\"fix\":\"40-70字，一个自然的破冰动作或话术\"},\n{\"name\":\"朋友带朋友\",\"read\":\"40-70字，写朋友介绍你时的氛围\",\"fix\":\"40-70字，一个自然的打开方式\"},\n{\"name\":\"公司新人/工作群\",\"read\":\"40-70字，写同事第一次加你微信或看头像的感觉\",\"fix\":\"40-70字，一个不油腻的表达\"},\n{\"name\":\"约会开场\",\"read\":\"40-70字，写对方第一眼可能如何进入状态\",\"fix\":\"40-70字，一个可以直接使用的开场动作或话术\"}\n],\n\"tweaks\":[{\"title\":\"6字以内动作名\",\"do\":\"30-55字，具体到今天就能做\",\"why\":\"25-45字，解释为什么这个信号有效\"},{\"title\":\"\",\"do\":\"\",\"why\":\"\"},{\"title\":\"\",\"do\":\"\",\"why\":\"\"}],\n\"closing\":\"18-30字，有转折、适合发朋友圈或分享卡\",\n\"shareCaption\":\"12-28字，像小红书用户会配在结果图下面的话，例如‘原来我不是高冷，是开机比较慢’\"\n}\n所有字段必须填满，scores 必须是 0-100 整数，场景必须严格使用给出的四个 name，tweaks 必须 3 条。"; }

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
          { type: "text", text: buildPrompt(selfScores) + "\n\n仅分析这张照片的可见呈现，不推断真实人格、可信度、攻击性、智力、职业能力、心理状态或他人实际反应。七个字段的含义覆盖原有定义：trust=画面端正感，warmth=表情柔和度，edge=造型视觉锐度，presence=构图醒目度，composure=姿态放松度，memory=造型辨识度，clarity=着装正式感。数值只是主观风格刻度，不是测量、概率、排名或科学结论。只描述可见表情、姿态、衣着、光线、背景和构图；不可编造动作、语气、神经反应或人生经历。headline 不强行制造落差；不能宣称知道陌生人如何判断。cost 表达照片风格的局限而非人生代价，projection 只解释拍摄条件与自评口径不同。建议仅涉及拍摄、造型和可选表达，不要求改变身体。保留要求的 JSON 字段与数组数量，所有文案遵循本段，冲突时以本段为准。" },
        ],
      },
    ],
    temperature: 0.85,
    max_tokens: 2600,
    // Qwen3.8 系列默认开启思考模式，会把单次调用从 3 秒拖到 25-50 秒。
    // 这个任务不需要长链推理，关掉它。
    enable_thinking: false,
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 110000);

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
    headline: str(j.headline, 100) || "第一眼有点神秘，聊两句就暴露了你的好相处",
    typeName: str(j.typeName, 60),
    typeDesc: str(j.typeDesc, 240),
    firstThought: str(j.firstThought, 360),
    misread: str(j.misread, 220),
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
    shareCaption: str(j.shareCaption, 100),
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

  const allowed = new Set(['index.html','style.css','app.js','config.js','questions.js','radar.js','report.js','sharecard.js']);
  if (!allowed.has(rel.replace(/^\//,''))) { res.writeHead(404); res.end('Not found'); return; }
  const filePath = path.join(WEB_ROOT, rel);
  const root = WEB_ROOT;

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
