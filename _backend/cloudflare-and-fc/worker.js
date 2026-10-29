/* Cloudflare Worker 版本（备选方案）
 *
 * 优点：完全免费、不用备案、30 秒部署。
 * 缺点：*.workers.dev 在国内部分网络可能不稳。如果主要用户在国内，用 FC。
 *
 * 部署：
 *   1. 装 wrangler：npm i -g wrangler
 *   2. wrangler login
 *   3. wrangler secret put DASHSCOPE_API_KEY
 *   4. wrangler deploy
 *   或者直接在 Cloudflare 网页控制台 → Workers → 创建 → 粘贴本文件 → 在 Settings 里加环境变量
 */
const DASHSCOPE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

const DIMS = ["trust", "warmth", "edge", "presence", "composure", "memory", "clarity"];
const DIM_CN = {
  trust: "可信度", warmth: "亲和度", edge: "攻击性", presence: "气场",
  composure: "松弛感", memory: "记忆点", clarity: "专业度",
};

const PROMPT = (selfScores) => `你是一位极准的观察者，专门做一件事：把「一个陌生人在看到这张照片的头 3 秒里，不受控制地生出的判断」如实翻译出来。

游客已经自评了七个维度（0-100，越高代表他认为自己在别人眼里越强）：
${DIMS.map((k) => `${DIM_CN[k]}：${selfScores[k] ?? 50}`).join("\n")}

你的任务不是评价美丑，而是模拟那个陌生人。

【绝对禁止】
1. 不评价美丑、不给总分、不给颜值评分
2. 不评价身材、体重、年龄、种族、肤色
3. 不提任何医美、整容、填充、手术建议
4. 不给「你是第几名」这类排名
5. 照片若是明显未成年人、非人脸、多人、严重模糊，只输出 {"error":"REFUSE:原因"}
6. 不使用：颜值、好看、漂亮、丑、美女、帅哥

【必须做到】
1. 所有观察落到具体面部依据（眉骨、眼窝、唇线、下颌线、眼睛开合、面部留白、光的落点），让读者觉得「你真的看了我的照片」
2. 每条负面必须：①指向「别人的默认读法」不指向五官本身 ②附带可执行修正 ③不造成纯伤害
3. 语言克制、具体。禁止抒情、比喻堆砌、禁止「宛如」「仿佛」
4. 每条断言必须可被反驳。禁止「你很有魅力」这种无法证伪的话
5. 第二人称「你」
6. 七个维度分数要有明显高峰和低洼，不要都堆在 60-75

【输出】只输出一个 JSON 对象，不要任何解释、不要代码块：

{
  "headline": "15-30字，必须含落差结构：你以为是「A」，别人读成「B」，A 和 B 用「」包住",
  "tags": ["三个 2-4 字标签，别人对他的第一印象归类"],
  "scores": {"trust":0-100,"warmth":0-100,"edge":0-100,"presence":0-100,"composure":0-100,"memory":0-100,"clarity":0-100},
  "dims": {"trust":{"read":"陌生人视角的行为描述40-70字","cost":"他损失了什么25-40字"}, "warmth":{"read":"","cost":""}, "edge":{"read":"","cost":""}, "presence":{"read":"","cost":""}, "composure":{"read":"","cost":""}, "memory":{"read":"","cost":""}, "clarity":{"read":"","cost":""}},
  "evidence": ["具体面部观察30-50字，含可指认的解剖或光位细节，3-4条"],
  "projection": "落差的成因，60-100字：他按自己最好的状态评估自己，别人按他的默认状态评估他",
  "gain": "这套读法免费送他什么红利，40-60字",
  "cost": "代价，40-60字，让人心里一动但不刻薄",
  "scenes": [
    {"name":"职场初面","read":"","fix":""},
    {"name":"第一次见面","read":"","fix":""},
    {"name":"约会","read":"","fix":""},
    {"name":"镜头与照片","read":"","fix":""}
  ],
  "tweaks": [
    {"title":"6字以内动作名","do":"具体做法30-50字，零成本当天可做，绝不涉及医美","why":"为什么有效30-50字"},
    {"title":"","do":"","why":""},
    {"title":"","do":"","why":""}
  ],
  "closing": "可当签名的短句15-25字，第二人称，有转折，不给鸡汤感"
}

tweaks 必须 3 条，scenes 必须 4 条。再次强调：只输出 JSON。`;

function parseJSON(raw) {
  if (!raw) throw new Error("模型返回了空内容。");
  let t = String(raw).trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  return JSON.parse(t);
}

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function sanitize(j) {
  if (!j || typeof j !== "object") throw new Error("返回数据结构异常。");
  if (j.error) {
    const m = String(j.error);
    if (m.startsWith("REFUSE:")) return { error: m.replace("REFUSE:", "").trim() };
    throw new Error(m);
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
  const arr = (a, n, len) =>
    Array.isArray(a) ? a.map((x) => str(x, len)).filter(Boolean).slice(0, n) : [];

  return {
    headline: str(j.headline, 100) || "你以为是「随便看看」，别人读成「不太好接近」",
    tags: arr(j.tags, 3, 12),
    scores, dims,
    evidence: arr(j.evidence, 4, 120),
    projection: str(j.projection, 700),
    gain: str(j.gain, 340),
    cost: str(j.cost, 340),
    scenes: Array.isArray(j.scenes)
      ? j.scenes.slice(0, 4).map((s, i) => ({
          name: str(s?.name, 20) || ["职场初面", "第一次见面", "约会", "镜头与照片"][i] || "场景",
          read: str(s?.read, 320), fix: str(s?.fix, 320),
        }))
      : [],
    tweaks: Array.isArray(j.tweaks)
      ? j.tweaks.slice(0, 3).map((t) => ({
          title: str(t?.title, 40), do: str(t?.do, 320), why: str(t?.why, 280),
        }))
      : [],
    closing: str(j.closing, 140),
  };
}

async function handleAnalyze(request, env) {
  const API_KEY = env.DASHSCOPE_API_KEY;
  const MODEL = env.DASHSCOPE_MODEL || "qwen3-vl-plus";

  if (!API_KEY) throw Object.assign(new Error("服务端没有配置 DASHSCOPE_API_KEY。"), { code: 500 });

  const payload = await request.json();
  const { image, selfScores } = payload || {};
  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    throw Object.assign(new Error("没有收到有效的图片。"), { code: 400 });
  }

  const self = {};
  for (const k of DIMS) {
    const v = Number(selfScores?.[k]);
    self[k] = isFinite(v) ? Math.max(0, Math.min(100, v)) : 50;
  }

  const res = await fetch(DASHSCOPE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + API_KEY },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: "你是一个极其敏锐、语言克制的人类观察者。你只输出合法的 JSON，不输出任何其他内容。" },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: image } },
            { type: "text", text: PROMPT(self) },
          ],
        },
      ],
      temperature: 0.85,
      max_tokens: 2600,
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    let hint = `模型返回 ${res.status}`;
    if (res.status === 401) hint = "API Key 无效。";
    if (res.status === 403) hint = "该模型未开通。";
    if (res.status === 429) hint = "调用超限或余额不足。";
    throw Object.assign(new Error(hint + " " + txt.slice(0, 200)), { code: 502 });
  }

  const data = await res.json();
  const clean = sanitize(parseJSON(data?.choices?.[0]?.message?.content ?? ""));
  if (clean.error) throw Object.assign(new Error("这张照片暂时读不了：" + clean.error), { code: 422 });
  return clean;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const ORIGIN = env.ALLOW_ORIGIN || "*";

    const cors = {
      "Access-Control-Allow-Origin": ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json; charset=utf-8",
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    if (url.pathname === "/analyze" || url.pathname === "/api/analyze") {
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "只接受 POST。" }), { status: 405, headers: cors });
      }
      try {
        const out = await handleAnalyze(request, env);
        return new Response(JSON.stringify(out), { status: 200, headers: cors });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message || "分析失败。" }), {
          status: e.code || 500,
          headers: cors,
        });
      }
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true, service: "初见雷达" }), { status: 200, headers: cors });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: cors });
  },
};
