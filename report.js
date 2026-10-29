/* 结果页渲染
 * 数据结构（服务端已做字段兜底，这里仍做二次防御）：
 * {
 *   headline, tags[], evidence[], projection, gain, cost, gift,
 *   scores: { trust, warmth, ... }, dims: { trust: {read, cost}, ... },
 *   scenes: [{ name, read, fix, why }],
 *   tweaks: [{ title, do, why }],
 *   closing
 * }
 */
(function () {
  const DIMS = window.DIMS;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* 风格差异值：确定性计算，不由模型给 */
  window.computeGap = function (otherScores, selfScores) {
    const ds = DIMS.map((d) =>
      Math.abs((otherScores[d.key] ?? 50) - (selfScores[d.key] ?? 50))
    );
    const avg = ds.reduce((a, b) => a + b, 0) / ds.length;
    const max = Math.max.apply(null, ds);
    const gap = Math.round(avg * 2.2 + max * 0.6);
    return clamp(gap, 0, 100);
  };

  window.gapWord = function(gap) { return gap >= 50 ? '在这张照片中呈现出较大的风格差异' : '在这张照片中呈现得比较接近'; };
  window.biasInfo = function() { return {title:'同一个人，可以有不同的照片表达',body:'差异值只比较 AI 的主观照片风格读数与自评，不代表认知偏差或他人的真实判断。数值没有高低优劣。'}; };

  function bar(label, val, cls, delay) {
    return `
      <div class="bar" title="${esc(label)} ${val}">
        <div class="fill ${cls}" data-w="${clamp(val, 0, 100)}" style="transition-delay:${delay}ms"></div>
      </div>`;
  }

  window.renderReport = function (data, ctx) {
    const scores = data.scores || {};
    const dims = data.dims || {};
    const self = ctx.selfScores;
    const gap = ctx.gap;
    const bias = window.biasInfo(scores, self);

    const otherArr = DIMS.map((d) => clamp(scores[d.key] ?? 50, 0, 100));
    const selfArr = DIMS.map((d) => clamp(self[d.key] ?? 50, 0, 100));

    const tags = (data.tags || []).slice(0, 3);
    const evidence = (data.evidence || []).slice(0, 4);
    const scenes = data.scenes || [];
    const tweaks = (data.tweaks || []).slice(0, 3);

    const dimHtml = DIMS.map((d, i) => {
      const info = dims[d.key] || {};
      const o = otherArr[i];
      const s = selfArr[i];
      return `
      <div class="dim fade-up" style="animation-delay:${i * 60}ms">
        <div class="dim-head">
          <span class="dim-name">${esc(d.name)}</span>
          <span class="dim-scores"><span class="o">${Math.round(o)}</span> / <span class="s">${Math.round(s)}</span></span>
        </div>
        ${bar("他人读数", o, "other", 80 + i * 60)}
        ${bar("你的自评", s, "self", 160 + i * 60)}
        <p class="dim-read">${esc(info.read || "")}</p>
        ${info.cost ? `<p class="dim-cost">${esc(info.cost)}</p>` : ""}
      </div>`;
    }).join("");

    const sceneHtml = scenes
      .map(
        (s, i) => `
      <div class="scene fade-up" style="animation-delay:${i * 60}ms">
        <span class="scene-name">${esc(s.name || "")}</span>
        <p class="scene-read">${esc(s.read || "")}</p>
        ${s.fix ? `<div class="scene-fix"><b>可以做的事</b>${esc(s.fix)}</div>` : ""}
      </div>`
      )
      .join("");

    const tweakHtml = tweaks
      .map(
        (t, i) => `
      <div class="tweak fade-up" style="animation-delay:${i * 60}ms">
        <div class="tweak-n">${i + 1}</div>
        <div class="tweak-body">
          <h5>${esc(t.title || "")}</h5>
          <p>${esc(t.do || "")}</p>
          ${t.why ? `<p class="why">${esc(t.why)}</p>` : ""}
        </div>
      </div>`
      )
      .join("");

    return `
    <div class="report">

      <!-- ① 封面断言 -->
      <section class="cover fade-in">
        <span class="cover-tag"><i></i>初见雷达 · 第一印象报告</span>
        <h1 class="cover-headline">${fmtHeadline(data.headline)}</h1>

        <div class="gap-block fade-up">
          <div class="gap-num-wrap">
            <div class="gap-label">落差指数</div>
            <div class="gap-num num" id="gapNum">0<small>/100</small></div>
          </div>
          <p class="gap-desc">
            照片呈现，和你的自评，<span>${esc(window.gapWord(gap))}。</span>
          </p>
        </div>

        ${tags.length ? `<div class="tags">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : ""}
      </section>

      <!-- ② 双雷达 -->
      <section class="sec">
        <div class="sec-head">
          <span class="sec-idx">01</span>
          <h2 class="sec-title">两种视角的形状</h2>
        </div>
        <p class="sec-sub">金色是 AI 对这张照片呈现效果的主观描述，蓝色是你的自评。差异不代表别人真实的看法。</p>

        <div class="radar-card">
          <div id="radarHost"></div>
          <div class="radar-legend">
            <span class="lg other"><i></i>别人读到的你</span>
            <span class="lg self"><i></i>你理解的自己</span>
          </div>
        </div>

        <div class="bias-note">
          <b>${esc(bias.title)}</b><br>${esc(bias.body)}
        </div>
      </section>

      <!-- ③ 七维 -->
      <section class="sec">
        <div class="sec-head">
          <span class="sec-idx">02</span>
          <h2 class="sec-title">七个维度，逐条</h2>
        </div>
        <p class="sec-sub">每一条都写成「陌生人会怎么做」，而不是「你是什么样的人」。结果受光线、表情和拍摄方式影响。</p>
        <div>${dimHtml}</div>
      </section>

      <!-- ④ 落差拆解 -->
      <section class="sec">
        <div class="sec-head">
          <span class="sec-idx">03</span>
          <h2 class="sec-title">这道落差是从哪儿来的</h2>
        </div>
        <p class="sec-sub">先是我在你脸上读到的东西，然后是它为什么会变成一种误读。</p>

        ${
          evidence.length
            ? `<div>${evidence
                .map(
                  (e, i) =>
                    `<div class="evi"><span class="evi-n">0${i + 1}</span><p>${esc(e)}</p></div>`
                )
                .join("")}</div>`
            : ""
        }

        ${
          data.projection
            ? `<div class="prose-block fade-up">
                 <h4>为什么会错位</h4>
                 <p>${esc(data.projection)}</p>
               </div>`
            : ""
        }

        ${
          data.gain || data.cost
            ? `<div class="divide2">
                 ${data.gain ? `<div class="half gain"><h5>免费送你的红利</h5><p>${esc(data.gain)}</p></div>` : ""}
                 ${data.cost ? `<div class="half loss"><h5>它让你付出的代价</h5><p>${esc(data.cost)}</p></div>` : ""}
               </div>`
            : ""
        }
      </section>

      <!-- ⑤ 场景翻译 -->
      ${
        scenes.length
          ? `<section class="sec">
              <div class="sec-head">
                <span class="sec-idx">04</span>
                <h2 class="sec-title">落到具体场合</h2>
              </div>
              <p class="sec-sub">同一个读法，在不同场合里含义完全不同。这里只讲你能改的部分。</p>
              <div>${sceneHtml}</div>
            </section>`
          : ""
      }

      <!-- ⑥ 三个调整 -->
      ${
        tweaks.length
          ? `<section class="sec">
              <div class="sec-head">
                <span class="sec-idx">05</span>
                <h2 class="sec-title">三个今天可试的调整</h2>
              </div>
              <p class="sec-sub">全部当天可做、零成本。不改你的脸，只改别人读你的那 3 秒。</p>
              <div>${tweakHtml}</div>
            </section>`
          : ""
      }

      <!-- ⑦ 一句话 -->
      ${
        data.closing
          ? `<div class="closing fade-up">
              <div class="closing-mark">“</div>
              <p class="closing-line">${esc(data.closing)}</p>
            </div>`
          : ""
      }

      <!-- 操作 -->
      <div class="report-actions">
        <button class="btn btn-primary" id="btnShare">生成分享卡片</button>
        <button class="btn btn-ghost" id="btnRestart">换一张照片再测</button>
      </div>

      <p class="disclaimer">
        这份报告是对「陌生人的第一眼读法」的模拟，不是对你的评价。<br>
        这是主观照片风格分析，不代表真实人格或他人的实际判断。
      </p>
    </div>`;
  };

  /* 断言里高亮引号内容 */
  function fmtHeadline(s) {
    if (!s) return "";
    const safe = esc(s);
    return safe.replace(/「([^」]{1,40})」/g, '<span class="q">「$1」</span>')
               .replace(/“([^”]{1,40})”/g, '<span class="q">“$1”</span>');
  }

  /* 挂载后：雷达 + 进度条 + 数字滚动 */
  window.mountReport = function (root, data, ctx) {
    const host = root.querySelector("#radarHost");
    if (host) {
      window.renderRadar(host, {
        other: DIMS.map((d) => clamp(data.scores[d.key] ?? 50, 0, 100)),
        self: DIMS.map((d) => clamp(ctx.selfScores[d.key] ?? 50, 0, 100)),
        labels: DIMS.map((d) => d.name),
      });
    }

    // 进度条
    requestAnimationFrame(() => {
      root.querySelectorAll(".fill").forEach((f) => {
        f.style.width = f.dataset.w + "%";
      });
    });

    // 落差数字滚动
    const gapEl = root.querySelector("#gapNum");
    if (gapEl) {
      const target = ctx.gap;
      const dur = 1400;
      const t0 = performance.now();
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        gapEl.innerHTML = target + "<small>%</small>";
      } else {
        (function tick(now) {
          const p = Math.min(1, (now - t0) / dur);
          const e = 1 - Math.pow(1 - p, 3);
          gapEl.innerHTML = Math.round(target * e) + "<small>%</small>";
          if (p < 1) requestAnimationFrame(tick);
        })(t0);
      }
    }
  };
})();
