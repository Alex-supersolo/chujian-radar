/* 阿里云函数计算 FC · Node.js 20 处理函数
 *
 * 这是给线上用的：GitHub Pages 放前端，这个函数放 API（Key 只在服务端）。
 * 部署步骤见 README.md「部署」一节。
 *
 * 环境变量（在 FC 控制台配置）：
 *   DASHSCOPE_API_KEY   必填
 *   DASHSCOPE_MODEL     选填，默认 qwen3.8-max
 *   ALLOW_ORIGIN        选填，默认 *（建议改成你的 GitHub Pages 域名）
 */
const DASHSCOPE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

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

function parseJSON(raw) {
  if (!raw) throw new Error("模型返回了空内容。");
  let t = String(raw).trim();
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  return JSON.parse(t);
}

function str(v, max) {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

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
    dims[k] = { read: str(s.read, 260) || "这一项没有读出来。", cost: str(s.cost, 200) };
  }

  const strs = (a, n, len) =>
    Array.isArray(a) ? a.map((x) => str(x, len)).filter(Boolean).slice(0, n) : [];

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

/* FC Node.js 20 原生 HTTP handler */
exports.handler = async (req, resp) => {
  const ORIGIN = process.env.ALLOW_ORIGIN || "*";
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    resp.writeHead(204, headers).end();
    return;
  }

  const reply = (code, obj) => resp.writeHead(code, headers).end(JSON.stringify(obj));

  if (req.method !== "POST") {
    reply(405, { error: "只接受 POST。" });
    return;
  }

  const API_KEY = process.env.DASHSCOPE_API_KEY || "";
  const MODEL = process.env.DASHSCOPE_MODEL || "qwen3.8-max";

  if (!API_KEY) {
    reply(500, { error: "服务端没有配置 DASHSCOPE_API_KEY。" });
    return;
  }

  let payload;
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (e) {
    reply(400, { error: "请求格式不对。" });
    return;
  }

  const { image, selfScores } = payload || {};
  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    reply(400, { error: "没有收到有效的图片。" });
    return;
  }

  const self = {};
  for (const k of DIMS) {
    const v = Number(selfScores?.[k]);
    self[k] = isFinite(v) ? Math.max(0, Math.min(100, v)) : 50;
  }

  try {
    const res = await fetch(DASHSCOPE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + API_KEY,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: "你是一个极其敏锐、语言克制的人类观察者。你只输出合法的 JSON，不输出任何其他内容。",
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: image } },
              { type: "text", text: buildPrompt(self) },
            ],
          },
        ],
        temperature: 0.85,
        max_tokens: 2600,
        enable_thinking: false,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      let hint = `模型返回 ${res.status}`;
      if (res.status === 401) hint = "API Key 无效。";
      if (res.status === 403) hint = "该模型未开通，去百炼控制台开通 " + MODEL + "。";
      if (res.status === 429) hint = "调用超限或余额不足。";
      reply(502, { error: hint + " " + txt.slice(0, 200) });
      return;
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    const clean = sanitize(parseJSON(text));

    if (clean.error) {
      reply(422, { error: "这张照片暂时读不了：" + clean.error });
      return;
    }
    reply(200, clean);
  } catch (e) {
    console.error("[analyze]", e);
    reply(500, { error: e.message || "分析失败。" });
  }
};
