/* 初见雷达 · 主应用
 * 无框架、无构建、hash 路由。
 */
(function () {
  const app = document.getElementById("app");
  const DIMS = window.DIMS;
  const QUESTIONS = window.QUESTIONS;
  const OPTIONS = window.OPTIONS;
  const CFG = window.CJLD_CONFIG || {};
  const lifecycle = {id:0};

  const S = {
    photoFile: null,
    photoURL: null,   // objectURL 供预览
    photoData: null,  // base64 dataURL（压缩后）
    photoImg: null,   // Image 对象，分享卡用
    answers: {},      // { dimKey: 30|50|70|88 }
    report: null,
    gap: 0,
    selfScores: {},
    busy: false,
  };

  /* ---------------- 路由 ---------------- */
  const routes = {};
  function route() {
    const h = (location.hash || "#/").replace(/^#/, "");
    const path = h.split("?")[0];
    if (routes[path]) routes[path]();
    else routes["/"]();
  }
  window.addEventListener("hashchange", () => {
    lifecycle.id++;
    route();
    window.scrollTo(0, 0);
  });

  /* ---------------- 落地页 ---------------- */
  routes["/"] = function () {
    app.innerHTML = `
      <section class="hero fade-in">
        <span class="eyebrow">FIRST IMPRESSION RADAR</span>
        <h1 class="hero-title">
          你永远看不到<br>的那 <em>3 秒</em>
        </h1>
        <p class="hero-sub">
          一张照片，会传递怎样的视觉印象？<br>
          用七道自评与 AI 照片风格分析，看看两种视角的差异。<br>
          <strong>光线、表情和造型的一点变化，也能带来新鲜的自己。</strong>
        </p>

        ${
          S.photoURL
            ? `<div class="preview-wrap">
                 <div class="preview-frame"><img src="${S.photoURL}" alt="你的照片"></div>
                 <div class="preview-meta">
                   <span>照片经服务端发送至千问；本站不主动保存照片</span>
                   <button class="link-btn" id="rePick">换一张</button>
                 </div>
               </div>`
            : `<div class="uploader" id="uploader">
                 <svg class="uploader-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
                   <rect x="3" y="3" width="18" height="18" rx="1"/>
                   <circle cx="12" cy="12" r="4.2"/>
                   <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none"/>
                 </svg>
                 <div class="uploader-title">放一张正面照</div>
                 <div class="uploader-hint">
                   点这里选择照片，或直接把图片拖进来<br>
                   光线均匀、能看清五官、别戴墨镜 — 方便分析照片风格
                 </div>
                 <input type="file" id="fileInput" accept="image/*">
               </div>`
        }
      </section>

      ${S.photoURL ? renderQuestions() : ""}

      <section class="sec" style="margin-top:64px">
        <div class="sec-head">
          <span class="sec-idx">·</span>
          <h2 class="sec-title">它是怎么算的</h2>
        </div>
        <p class="sec-sub" style="margin-bottom:0">
          七道题拿到「你理解的自己」，视觉模型拿到「照片呈现」——
          两份读数叠在一起，差异越大的地方，风格差异值越高。
        </p>
      </section>
    `;

    bindUpload();
    bindQuestions();

    if (S.photoURL) {
      S.photoURL && (app.querySelector("img").onload = () => {});
    }
  };

  function renderQuestions() {
    const done = Object.keys(S.answers).length;
    return `
      <div class="step-label">
        <span class="n">02 / 02</span>
        <span class="t">先说说你以为的自己</span>
      </div>
      <p class="hero-sub" style="font-size:14px;margin-bottom:0">
        七道题，凭直觉点。不要选「应该是这样」的那个。
      </p>

      <div class="qlist">
        ${QUESTIONS.map(
          (q, i) => `
          <div class="qitem">
            <p class="qtext"><span class="qn">0${i + 1}</span>${q.text}</p>
            <div class="opts" data-dim="${q.dim}">
              ${OPTIONS.map(
                (o) => `
                <button class="opt ${S.answers[q.dim] === o.value ? "on" : ""}"
                        data-val="${o.value}">${o.label}</button>`
              ).join("")}
            </div>
          </div>`
        ).join("")}
      </div>

      <div class="action-bar">
        <button class="btn btn-primary btn-wide" id="btnGo" ${done < 7 ? "disabled" : ""}>
          ${done < 7 ? `还剩 ${7 - done} 题` : "看陌生人对你的第一判断"}
        </button>
      </div>`;
  }

  function bindQuestions() {
    const go = app.querySelector("#btnGo");
    if (!go) return;

    app.querySelectorAll(".opts").forEach((grp) => {
      grp.querySelectorAll(".opt").forEach((btn) => {
        btn.addEventListener("click", () => {
          const dim = grp.dataset.dim;
          S.answers[dim] = Number(btn.dataset.val);
          grp.querySelectorAll(".opt").forEach((b) => b.classList.remove("on"));
          btn.classList.add("on");

          const n = Object.keys(S.answers).length;
          if (go) {
            go.disabled = n < 7;
            go.textContent = n < 7 ? `还剩 ${7 - n} 题` : "看陌生人对你的第一判断";
          }
          // 答满自动滚到按钮
          if (n === 7) {
            setTimeout(() => go.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
          }
        });
      });
    });

    go.addEventListener("click", startAnalysis);
  }

  /* ---------------- 上传 ---------------- */
  function bindUpload() {
    const up = app.querySelector("#uploader");
    const input = app.querySelector("#fileInput");
    const repick = app.querySelector("#rePick");

    if (repick) {
      repick.addEventListener("click", () => {
        S.photoFile = null;
        S.photoURL = null;
        S.photoData = null;
        routes["/"]();
      });
    }

    if (!up || !input) return;

    up.addEventListener("click", () => input.click());

    up.addEventListener("dragover", (e) => {
      e.preventDefault();
      up.classList.add("drag");
    });
    up.addEventListener("dragleave", () => up.classList.remove("drag"));
    up.addEventListener("drop", (e) => {
      e.preventDefault();
      up.classList.remove("drag");
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handleFile(f);
    });

    input.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) handleFile(f);
    });
  }

  async function handleFile(file) {
    if (file.size > 20 * 1024 * 1024) { alert("请选择小于 20MB 的照片。"); return; }
    if (!file.type.startsWith("image/")) {
      alert("请选择一张图片。");
      return;
    }
    S.photoFile = file;
    if (S.photoURL) URL.revokeObjectURL(S.photoURL);
    S.photoURL = URL.createObjectURL(file);

    try {
      const { dataURL, img } = await compress(file, 900, 0.86);
      S.photoData = dataURL;
      S.photoImg = img;
    } catch (e) {
      alert("这张图片读不出来，换一张试试。");
      return;
    }
    routes["/"]();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* 压缩到长边 max，JPEG 质量 q —— 省 token、省时间 */
  function compress(file, max, q) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const cv = document.createElement("canvas");
        cv.width = w;
        cv.height = h;
        const ctx = cv.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, w, h);
        const dataURL = cv.toDataURL("image/jpeg", q);
        URL.revokeObjectURL(url);
        resolve({ dataURL, img });
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("image load failed"));
      };
      img.src = url;
    });
  }

  /* ---------------- 分析流程 ---------------- */
  // 步骤节奏按 qwen3.8-max 约 35-45 秒的真实耗时设计，最后一步留在「生成」态等结果
  const LOAD_STEPS = [
    "正在定位面部焦点区域",
    "正在分析照片光线与构图",
    "正在观察照片中的表情",
    "正在观察服饰与色彩",
    "正在整理视觉风格建议",
    "正在对照你的七项自评",
    "正在生成七维读数与落差",
  ];

  async function startAnalysis() {
    if (S.busy) return;
    if (!S.photoData) { alert("先选一张照片。"); return; }
    if (Object.keys(S.answers).length < 7) return;

    const requestId = lifecycle.id;
    S.busy = true;
    S.selfScores = {};
    DIMS.forEach((d) => (S.selfScores[d.key] = S.answers[d.key] || 50));

    app.innerHTML = `
      <div class="loading">
        <div class="scan fade-in">
          <img src="${S.photoURL}" alt="">
          <span class="scan-corner tl"></span><span class="scan-corner tr"></span>
          <span class="scan-corner bl"></span><span class="scan-corner br"></span>
        </div>
        <div class="steps-log" id="log">
          ${LOAD_STEPS.map(
            (t, i) => `<div class="log-row" data-i="${i}"><span class="dot"></span><span>${t}</span></div>`
          ).join("")}
        </div>
        <p class="loading-note" id="note">通常需要 30–60 秒，正在生成照片风格报告</p>
      </div>`;

    // 仪式感：逐步点亮（不阻塞真实请求）。节奏按真实耗时放慢。
    const rows = app.querySelectorAll(".log-row");
    let idx = 0;
    const stepTimer = setInterval(() => {
      if (idx > 0 && rows[idx - 1]) rows[idx - 1].classList.replace("active", "done");
      if (idx < rows.length) {
        rows[idx].classList.add("active");
        idx++;
      } else {
        clearInterval(stepTimer);
        const note = app.querySelector("#note");
        if (note) note.textContent = "快好了，正在把读数写成人话";
      }
    }, 4800);

    try {
      const result = await callAPI(S.photoData, S.selfScores);
      clearInterval(stepTimer);
      rows.forEach((r) => {
        r.classList.remove("active");
        r.classList.add("done");
      });

      if (requestId !== lifecycle.id) { S.busy = false; return; }
      S.report = result;
      S.gap = window.computeGap(result.scores, S.selfScores);
      S.busy = false;

      renderReportPage();
    } catch (e) {
      clearInterval(stepTimer);
      S.busy = false;
      if (requestId === lifecycle.id) renderError(e);
    }
  }

  /* ---------------- API ---------------- */
  async function callAPI(photoDataURL, selfScores) {
    const base = (CFG.apiBase || "").replace(/\/$/, "");
    const isLocal =
      location.hostname === "localhost" || location.hostname === "127.0.0.1";
    const url = base ? base + "/analyze" : isLocal ? "/api/analyze" : "";

    // 线上且没配代理 → 演示模式
    if (!url) {
      await sleep(1200);
      throw new Error("分析服务尚未连接，请稍后再试。当前不会用示例报告替代真实分析。");
    }

    let res;
    try {
      res = await fetch(url, {
        signal: AbortSignal.timeout(110000),
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: photoDataURL, selfScores }),
      });
    } catch (e) {
      throw new Error("连不上分析服务。检查网络，或确认代理地址配置正确。");
    }

    if (!res.ok) {
      let msg = "";
      try {
        const j = await res.json();
        msg = j.error || "";
      } catch (_) {}
      throw new Error(msg || "分析服务返回了 " + res.status);
    }

    const j = await res.json();
    if (!j || !j.scores) throw new Error("返回的数据不完整。");
    return normalize(j);
  }

  /* 前端二次兜底：模型抽风也不能把页面打崩 */
  function normalize(j) {
    const scores = {};
    DIMS.forEach((d) => {
      let v = Number(j.scores && j.scores[d.key]);
      if (!isFinite(v)) v = 50;
      scores[d.key] = Math.max(0, Math.min(100, Math.round(v)));
    });

    const dims = {};
    DIMS.forEach((d) => {
      const src = (j.dims && j.dims[d.key]) || {};
      dims[d.key] = {
        read: String(src.read || "这一项没有读出来。").slice(0, 240),
        cost: String(src.cost || "").slice(0, 180),
      };
    });

    const arr = (a, n) => (Array.isArray(a) ? a.filter((x) => typeof x === "string" && x.trim()).slice(0, n) : []);

    return {
      headline: String(j.headline || "你以为是「随便看看」，别人读成「不太好接近」").slice(0, 90),
      tags: arr(j.tags, 3),
      evidence: arr(j.evidence, 4),
      projection: String(j.projection || "").slice(0, 600),
      gain: String(j.gain || "").slice(0, 300),
      cost: String(j.cost || "").slice(0, 300),
      scores,
      dims,
      scenes: Array.isArray(j.scenes)
        ? j.scenes.slice(0, 4).map((s) => ({
            name: String(s.name || "").slice(0, 20),
            read: String(s.read || "").slice(0, 300),
            fix: String(s.fix || "").slice(0, 300),
          }))
        : [],
      tweaks: Array.isArray(j.tweaks)
        ? j.tweaks.slice(0, 3).map((t) => ({
            title: String(t.title || "").slice(0, 40),
            do: String(t.do || "").slice(0, 300),
            why: String(t.why || "").slice(0, 240),
          }))
        : [],
      closing: String(j.closing || "").slice(0, 120),
    };
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------------- 报告页 ---------------- */
  function renderReportPage() {
    app.innerHTML = window.renderReport(S.report, {
      selfScores: S.selfScores,
      gap: S.gap,
    });
    window.mountReport(app, S.report, {
      selfScores: S.selfScores,
      gap: S.gap,
    });

    app.querySelector("#btnShare").addEventListener("click", share);
    app.querySelector("#btnRestart").addEventListener("click", () => {
      S.report = null;
      S.answers = {};
      S.photoFile = null;
      S.photoURL = null;
      S.photoData = null;
      S.photoImg = null;
      location.hash = "#/";
      routes["/"]();
      window.scrollTo(0, 0);
    });
  }

  async function share() {
    const btn = app.querySelector("#btnShare");
    const old = btn.textContent;
    btn.textContent = "生成中…";
    btn.disabled = true;

    try {
      // 等字体就绪，避免 canvas 回退字体
      if (document.fonts && document.fonts.ready) await document.fonts.ready;

      const cv = window.buildShareCard(S.report, {
        gap: S.gap,
        selfScores: S.selfScores,
        photo: S.photoImg,
      });

      // 预览弹层
      const url = cv.toDataURL("image/png");
      showPreview(url, cv);
    } catch (e) {
      console.error(e);
      alert("生成失败，换个浏览器或再试一次。");
    } finally {
      btn.textContent = old;
      btn.disabled = false;
    }
  }

  function showPreview(url, cv) {
    const mask = document.createElement("div");
    mask.style.cssText =
      "position:fixed;inset:0;z-index:100;background:rgba(0,0,0,0.92);" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "padding:20px;gap:16px;overflow:auto;backdrop-filter:blur(6px)";
    mask.innerHTML = `
      <img src="${url}" style="max-width:100%;max-height:72vh;border:1px solid rgba(232,228,220,0.14);border-radius:3px">
      <p style="color:#6E6A64;font-size:12.5px;text-align:center;line-height:1.7">
        手机上如果点下载没反应 —— 长按上面这张图，选「存储图片」
      </p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
        <button class="btn btn-primary" id="dlBtn">保存图片</button>
        <button class="btn btn-ghost" id="closeBtn">关掉</button>
      </div>`;
    document.body.appendChild(mask);

    mask.querySelector("#closeBtn").onclick = () => mask.remove();
    mask.querySelector("#dlBtn").onclick = () => window.downloadShareCard(cv, "初见雷达.png");
    mask.addEventListener("click", (e) => { if (e.target === mask) mask.remove(); });
  }

  /* ---------------- 错误 ---------------- */
  function renderError(e) {
    app.innerHTML = `
      <div class="err-box">
        <h4>没读出来</h4>
        <p>${escapeHtml(e.message || "未知错误")}</p>
        <p style="margin-top:14px;color:#6E6A64;font-size:12.5px">
          如果你在本地跑：确认 <code>node server.mjs</code> 已启动，且 <code>.env</code> 里填了 Key。<br>
          如果你在线上：确认 <code>config.js</code> 里的 <code>apiBase</code> 指向了部署好的代理。
        </p>
        <button class="btn btn-ghost" id="backBtn">返回重试</button>
      </div>`;
    app.querySelector("#backBtn").onclick = () => {
      location.hash = "#/";
      routes["/"]();
    };
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ---------------- 静态内容页 ---------------- */
  routes["/how"] = function () {
    app.innerHTML = `
      <div class="doc fade-in">
        <h1>它是怎么做的</h1>
        <p>不是测你长得多好看。颜值打分试图给一个客观结论，但那件事既不存在，也没有用。</p>
        <p>这里做的是另一件事：模拟一个陌生人看到你照片时，在 3 秒里不受控制地生出的判断。</p>

        <h2>两步</h2>
        <ul>
          <li><b>七道自评题</b> → 你理解的自己。题目都写成具体行为，避免回答更贴近自己的经验。</li>
          <li><b>一张照片</b> → 别人读到的你。由视觉模型给出七个维度的读数。</li>
        </ul>
        <p>两份读数叠在一起，错位的地方就是落差。<b>落差指数不由模型给，由公式算</b>，所以它是稳定、可复现的。</p>

        <h2>七条不该越过的线</h2>
        <ul>
          <li>不评价美丑，不给总分</li>
          <li>不评价身材、体重、年龄</li>
          <li>不提出任何医美或整容建议</li>
          <li>疑似未成年人直接拒绝分析</li>
          <li>所有负面都指向「别人的默认读法」，不指向五官本身</li>
          <li>每条负面必须附带可执行的修正动作</li>
          <li>不给单维度排名</li>
        </ul>

        <h2>关于"准"</h2>
        <p>它当然可能不准。你自己说过的很多话、做过的很多事，它都看不到。</p>
        <p>但有意思的往往不是它说对的部分，而是它说错的那一条 —— 你会立刻知道错在哪儿，然后发现：<b>原来我默认别人会那样看我。</b></p>
      </div>`;
  };

  routes["/privacy"] = function () {
    app.innerHTML = `
      <div class="doc fade-in">
        <h1>隐私</h1>
        <h2>照片去哪了</h2>
        <p>在浏览器里被压到长边 900px，转成 base64，直接发给你配置的分析代理，再转发给视觉模型。</p>
        <p><b>本站不主动将照片落盘、入库或写入日志。</b>照片会发送至阿里云千问进行处理，模型供应商和云平台的数据处理与留存规则以其政策为准。</p>

        <h2>代理能看到什么</h2>
        <p>如果你用的是自己部署的代理（阿里云函数计算 / Cloudflare Worker），那只有你能看到 —— 代码在仓库里，Key 在你的环境变量里。</p>
        <p>如果用的是别人搭的公共地址，那就等于把照片交给那个人。所以建议自己部署一个，成本是零。</p>

        <h2>没存的东西</h2>
        <ul>
          <li>不收集手机号、邮箱、微信</li>
          <li>不做用户体系，没有账号</li>
          <li>不用第三方统计、不打点、不埋 cookie</li>
          <li>答案和报告只存在当前页面内存里，刷新即消失</li>
        </ul>
      </div>`;
  };

  /* ---------------- 演示数据 ---------------- */
  const DEMO_REPORT = {
    headline: "你以为是「不好接近」，别人读成「有分量」",
    tags: ["冷感", "高辨识", "稳"],
    scores: { trust: 74, warmth: 41, edge: 79, presence: 82, composure: 68, memory: 76, clarity: 71 },
    dims: {
      trust: {
        read: "你会被归到「交给他不会出事」的那一类。别人第一次跟你谈事，语气会不自觉地正式半分。",
        cost: "代价是：没人会跟你开那种很松弛的玩笑，哪怕你其实很想。",
      },
      warmth: {
        read: "你不笑的时候，脸是往下走的。陌生人会先等你给出第一个信号，才决定要不要靠近。",
        cost: "破冰的成本落在你身上——大多数对话要你先开口。",
      },
      edge: {
        read: "你的眉骨比颧骨更靠前，眼窝就有了阴影，这让你的注视有重量。有人会把它读成不太好惹。",
        cost: "需要被安慰的人，通常不会第一个来找你。",
      },
      presence: {
        read: "你走进房间，会有人抬一下眼。不是因为你做什么，是因为你占的体量比你以为的大。",
        cost: "安静的时候，别人会以为你在不高兴，而不是在发呆。",
      },
      composure: {
        read: "你说完一句话会停一下，不急着填满。这个停顿在别人耳朵里是「他还有话」而不是「他卡住了」。",
        cost: "偶尔会被当成心不在焉，尤其是第一次见面。",
      },
      memory: {
        read: "你的脸是「有轮廓」的那种，不靠表情也立得住。见过一面的人，多半还记得你的样子。",
        cost: "记得你的脸，不代表记得你说过什么——你得更用力地讲自己的事。",
      },
      clarity: {
        read: "你还没开口，别人就默认你是懂行的那个。这是一种预付的信任。",
        cost: "一旦说错一次，扣掉的也比别人多。",
      },
    },
    evidence: [
      "你的嘴唇线条是平直的，不笑的时候嘴角略向下，这让静态的脸带上一点不妥协的意思。",
      "眉骨与颧骨的高低差明显，眼窝因此有阴影，注视感更集中。",
      "你的下颌线是清楚的，脸型有收口，视觉上不会散——这是「有分量」的来源。",
      "眼睛开合幅度偏小，看人的时候像在打量而不是在看，亲和度因此被压掉一截。",
    ],
    projection:
      "你大概在镜子里看自己太久了，记住的是某一个特定的表情，而不是别人一眼扫过的那 3 秒。你熟悉的是自己最松弛或最用力的那一面，而陌生人看到的是两者之间的平均值——一个你几乎没见过的版本。这在预期上是不公平的：你按自己最好的状态评估自己，别人按你的默认状态评估你。",
    gain: "陌生人会先给你让出半步，你不需要抢话就能被听见。很多需要费力证明自己的人，羡慕的正是这一点。",
    cost: "你被默认成「什么都能自己处理」的那种人。因此很少有人主动问你还好吗，哪怕是那些真的很在意你的人。",
    scenes: [
      {
        name: "职场初面",
        read: "对方在第一分钟就把你当成「不需要带」的那种新人，交代事情会直接，不会铺垫。这是信任，但也意味着他默认你不用被照顾。",
        fix: "开口第一句先把语速放慢一档，并在结尾补一句「这块我还不太熟，麻烦你多提一句」。这不会削弱分量，只会让人觉得你可靠且好合作。",
      },
      {
        name: "第一次见面",
        read: "对方会等你先释放信号。你如果一直维持默认表情，他会在三分钟后判定你不想聊。",
        fix: "不需要堆笑。在对方说话时把下巴收半寸、眼睛多停留半秒——这一个小动作就足以把「不好惹」翻成「在认真听」。",
      },
      {
        name: "约会",
        read: "你的沉默会被读成审视，而不是放松。对面的人会开始自我检查，越检查越紧。",
        fix: "把自己放在不舒服的位置上说出来，比如「我有点紧张，不太会找话题」。高分量的人坦白一次，亲近感会成倍涨——因为反差本身是稀缺的。",
      },
      {
        name: "镜头与照片",
        read: "静态照片会放大你的冷感，因为你最好看的东西在动起来之后才出现。所以你的照片总比真人难拍。",
        fix: "别正面平视。头部转 15–20 度、让光从侧前方来，你的轮廓优势才会显出来。平光和正脸会把「有分量」拍成「没表情」。",
      },
    ],
    tweaks: [
      {
        title: "松开咬肌",
        do: "每天两次，舌尖抵住上颚，让上下牙分开一指宽，保持 30 秒。见人前做一遍。",
        why: "你的紧张全写在腮帮子上。咬肌一紧，整张脸就往下沉，冷感会被推成敌意——而这只需要 30 秒就能解除。",
      },
      {
        title: "把「打量」改成「停留」",
        do: "和人对视时，不要立刻移开。多留半秒，同时收一点下巴。",
        why: "你的眼型在快速扫视时有审视感，在停留时却显得专注。同一个眼神，差别只在这半秒。",
      },
      {
        title: "先给一个廉价信号",
        do: "打招呼时加一个具体的小动作：点头、抬一下手里的杯子，或者一句「你先」。",
        why: "你不需要变得好接近，只需要让人确认「他允许我靠近」。一个动作的成本几乎为零，但它替你省掉了后面五分钟的尴尬。",
      },
    ],
    closing: "你不需要变得好接近，你需要被对的人认出来。",
  };

  /* 启动 */
  route();
})();
