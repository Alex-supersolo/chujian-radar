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

const DIMS = ["distance", "warmth", "trust", "presence", "chat", "memory", "boundary"];
const DIM_CN = {
  trust: "可信度", warmth: "亲和度", edge: "攻击性", presence: "气场",
  composure: "松弛感", memory: "记忆点", clarity: "专业度",
};

const PROMPT = () => "你是「初见雷达」的社交观察员。你的任务是模拟：一个中国成年人第一次在饭局、工作群、朋友介绍、课堂、公司或约会中看到用户照片时，脑子里可能先闪过的印象。\n\n这不是颜值评分，也不是照片风格分析。请输出一个有趣、具体、让人想发给朋友讨论的「第一印象画像」。\n\n只能根据照片里可见的表情、姿态、穿着、构图和整体视觉信号做娱乐性模拟。不能断言陌生人的真实想法，不能从脸推断人格、智力、收入、职业能力、道德、心理疾病、恋爱经历或可信度。不要评价美丑、年龄、身材、种族、皮肤、五官缺陷，不给医美建议。\n\n本土语境要自然使用这些场景：饭局第一次见面、朋友带朋友、公司新人、工作群头像、同学聚会、相亲/约会开场、排队或电梯偶遇。文案要像朋友在背后描述一个人，轻松、准确、有一点调侃，但不能刻薄。\n\n七个维度：distance=距离感，warmth=亲和力，trust=靠谱感，presence=存在感，chat=好聊感，memory=记忆点，boundary=边界感。分数只是娱乐刻度，不是科学测量。\n\n重要：headline 必须是能让用户截图的反差句，例如「你以为自己很普通，别人先记住了你的不好惹」或「第一眼有点冷，聊两句就暴露了你的好相处」。不要固定使用“别人读成”，避免像机器模板。\n\n只输出合法 JSON，不要 markdown：\n{\n\"headline\":\"15-28字，有反差、有画面感的第一印象句\",\n\"tags\":[\"2-5字社交标签\",\"标签\",\"标签\"],\n\"typeName\":\"一个可传播的类型名，例如慢热型显眼包、礼貌型距离感、低调的记忆点、看着难聊其实很有梗\",\n\"typeDesc\":\"40-70字，解释这种类型在中国日常社交里的表现\",\n\"firstThought\":\"50-90字，写陌生人第一眼可能产生的内心旁白，必须带饭局/群聊/朋友介绍等具体画面\",\n\"misread\":\"25-55字，一句朋友可能说的‘我第一次以为你……后来才发现……’\",\n\"scores\":{\"distance\":0,\"warmth\":0,\"trust\":0,\"presence\":0,\"chat\":0,\"memory\":0,\"boundary\":0},\n\"dims\":{\n\"distance\":{\"read\":\"30-55字：陌生人会不会主动靠近、怎么开场\",\"cost\":\"20-35字：可能造成的社交误会\"},\n\"warmth\":{\"read\":\"30-55字：别人会不会愿意接话\",\"cost\":\"20-35字：可能造成的误会\"},\n\"trust\":{\"read\":\"30-55字：第一次合作或加微信时的感觉\",\"cost\":\"20-35字：可能造成的误会\"},\n\"presence\":{\"read\":\"30-55字：进饭局、会议或群聊时的存在感\",\"cost\":\"20-35字：可能造成的误会\"},\n\"chat\":{\"read\":\"30-55字：别人是否想继续和你聊\",\"cost\":\"20-35字：可能造成的误会\"},\n\"memory\":{\"read\":\"30-55字：见过后是否容易记得\",\"cost\":\"20-35字：可能造成的误会\"},\n\"boundary\":{\"read\":\"30-55字：别人感受到的分寸感\",\"cost\":\"20-35字：可能造成的误会\"}\n},\n\"evidence\":[\"30-55字，照片中可见信号如何影响第一印象\",\"30-55字，照片中可见信号如何影响第一印象\",\"30-55字，照片中可见信号如何影响第一印象\"],\n\"projection\":\"50-90字，只解释为什么一张照片和真实相处会不同，不要说用户自我认知错误\",\n\"gain\":\"35-60字，写这种第一印象带来的社交红利\",\n\"cost\":\"35-60字，写这种第一印象可能让用户错过什么，但要可承受\",\n\"scenes\":[\n{\"name\":\"饭局第一次见面\",\"read\":\"40-70字，写别人怎么给你安排座位、怎么开第一句\",\"fix\":\"40-70字，一个自然的破冰动作或话术\"},\n{\"name\":\"朋友带朋友\",\"read\":\"40-70字，写朋友介绍你时的氛围\",\"fix\":\"40-70字，一个自然的打开方式\"},\n{\"name\":\"公司新人/工作群\",\"read\":\"40-70字，写同事第一次加你微信或看头像的感觉\",\"fix\":\"40-70字，一个不油腻的表达\"},\n{\"name\":\"约会开场\",\"read\":\"40-70字，写对方第一眼可能如何进入状态\",\"fix\":\"40-70字，一个可以直接使用的开场动作或话术\"}\n],\n\"tweaks\":[{\"title\":\"6字以内动作名\",\"do\":\"30-55字，具体到今天就能做\",\"why\":\"25-45字，解释为什么这个信号有效\"},{\"title\":\"\",\"do\":\"\",\"why\":\"\"},{\"title\":\"\",\"do\":\"\",\"why\":\"\"}],\n\"closing\":\"18-30字，有转折、适合发朋友圈或分享卡\",\n\"shareCaption\":\"12-28字，像小红书用户会配在结果图下面的话，例如‘原来我不是高冷，是开机比较慢’\"\n}\n所有字段必须填满，scores 必须是 0-100 整数，场景必须严格使用给出的四个 name，tweaks 必须 3 条。";

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
    headline: str(j.headline, 100) || "第一眼有点神秘，聊两句就暴露了你的好相处",
    typeName: str(j.typeName, 60),
    typeDesc: str(j.typeDesc, 240),
    firstThought: str(j.firstThought, 360),
    misread: str(j.misread, 220),
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
    shareCaption: str(j.shareCaption, 100),
  };
}

async function handleAnalyze(request, env) {
  const API_KEY = env.DASHSCOPE_API_KEY;
  const MODEL = env.DASHSCOPE_MODEL || "qwen3.8-max";

  if (!API_KEY) throw Object.assign(new Error("服务端没有配置 DASHSCOPE_API_KEY。"), { code: 500 });

  if (Number(request.headers.get('Content-Length') || 0) > 3000000) throw Object.assign(new Error('图片过大，请选择较小的照片。'), {code:413});
  const raw = await request.text();
  if (raw.length > 3000000) throw Object.assign(new Error('图片过大。'), {code:413});
  let payload;
  try { payload = JSON.parse(raw); } catch { throw Object.assign(new Error('请求格式不正确。'), {code:400}); }
  const { image, selfScores } = payload || {};
  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    throw Object.assign(new Error("没有收到有效的图片。"), { code: 400 });
  }

  const self = {};
  for (const k of DIMS) {
    const v = Number(selfScores?.[k]);
    self[k] = isFinite(v) ? Math.max(0, Math.min(100, v)) : 50;
  }

  const res = await fetch((env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(/\/$/, "") + "/chat/completions", {
    signal: AbortSignal.timeout(100000),
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
      // 关闭思考模式：qwen3.8 默认开启时单次调用要 30-50 秒
      enable_thinking: false,
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
    const ORIGIN = env.ALLOW_ORIGIN || 'https://alex-supersolo.github.io';
    if (request.headers.get('Origin') && request.headers.get('Origin') !== ORIGIN) return new Response('Forbidden', {status:403});

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
        if (env.ANALYZE_LIMITER) {
          const {success} = await env.ANALYZE_LIMITER.limit({key:request.headers.get('CF-Connecting-IP') || 'anonymous'});
          if (!success) return new Response(JSON.stringify({error:'尝试次数较多，请一分钟后再试。'}),{status:429,headers:cors});
        }
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
