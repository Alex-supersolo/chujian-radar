/* 分享卡生成：1080 × 1440，纯 canvas
 * 每张卡都独一无二（照片 + 断言 + 雷达各不相同），这是它比模板图强的地方。
 */
(function () {
  const W = 1080, H = 1440;
  const C = {
    bg: "#0A0A0B",
    bgCard: "#141416",
    ink: "#E8E4DC",
    ink2: "#A8A29A",
    ink3: "#6E6A64",
    gold: "#C9A96A",
    blue: "#6E8BA3",
    line: "rgba(232,228,220,0.13)",
  };
  const SERIF = '"Songti SC","Noto Serif CJK SC","Source Han Serif SC",Georgia,serif';
  const SANS = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* 按宽度折行 */
  function wrap(ctx, text, maxW) {
    const lines = [];
    let cur = "";
    for (const ch of String(text)) {
      if (ch === "\n") { lines.push(cur); cur = ""; continue; }
      const test = cur + ch;
      if (ctx.measureText(test).width > maxW && cur) {
        lines.push(cur);
        cur = ch;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function drawRadar(ctx, cx, cy, R, other, self, labels) {
    const n = other.length;
    const angles = [];
    for (let i = 0; i < n; i++) angles.push(-Math.PI / 2 + (i * 2 * Math.PI) / n);

    const pt = (a, v) => [cx + Math.cos(a) * R * (v / 100), cy + Math.sin(a) * R * (v / 100)];

    // 网格
    [50, 100].forEach((lv) => {
      ctx.beginPath();
      angles.forEach((a, i) => {
        const [x, y] = pt(a, lv);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.closePath();
      ctx.strokeStyle = "rgba(232,228,220,0.10)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // 轴
    angles.forEach((a) => {
      const [x, y] = pt(a, 100);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.strokeStyle = "rgba(232,228,220,0.07)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // 自评（虚线）
    ctx.beginPath();
    angles.forEach((a, i) => {
      const [x, y] = pt(a, self[i]);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = C.blue;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    // 他人（金色填充）
    ctx.beginPath();
    angles.forEach((a, i) => {
      const [x, y] = pt(a, other[i]);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(201,169,106,0.20)";
    ctx.fill();
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 标签
    ctx.font = `300 20px ${SANS}`;
    ctx.fillStyle = C.ink3;
    angles.forEach((a, i) => {
      const [x, y] = pt(a, 128);
      const cos = Math.cos(a);
      ctx.textAlign = cos > 0.3 ? "left" : cos < -0.3 ? "right" : "center";
      ctx.fillText(labels[i], x, y + 7);
    });
  }

  window.buildShareCard = function (data, ctxArg) {
    const gap = ctxArg.gap;
    const photo = ctxArg.photo; // HTMLImageElement or null
    const self = ctxArg.selfScores;
    const DIMS = window.DIMS;

    const otherArr = DIMS.map((d) => Math.max(0, Math.min(100, data.scores[d.key] ?? 50)));
    const selfArr = DIMS.map((d) => Math.max(0, Math.min(100, self[d.key] ?? 50)));

    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext("2d");

    // 背景
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    // 顶部金色微光
    const g = ctx.createRadialGradient(W * 0.5, -120, 0, W * 0.5, -120, 900);
    g.addColorStop(0, "rgba(201,169,106,0.16)");
    g.addColorStop(1, "rgba(201,169,106,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 700);

    // 外框
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(40, 40, W - 80, H - 80);

    // ---- 页眉 ----
    const headY = 118;
    if (photo) {
      const r = 46, px = 108, py = headY;
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      // cover 裁切
      const s = Math.max((r * 2) / photo.width, (r * 2) / photo.height);
      const dw = photo.width * s, dh = photo.height * s;
      ctx.drawImage(photo, px - dw / 2, py - dh / 2, dw, dh);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(201,169,106,0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.font = `400 40px ${SERIF}`;
      ctx.fillStyle = C.ink;
      ctx.fillText("初见雷达", 178, py - 4);

      ctx.font = `300 19px ${SANS}`;
      ctx.fillStyle = C.ink3;
      ctx.fillText("向 外 观 察 · 第 一 印 象 报 告", 178, py + 30);
    } else {
      ctx.textAlign = "left";
      ctx.font = `400 42px ${SERIF}`;
      ctx.fillStyle = C.ink;
      ctx.fillText("初见雷达", 108, headY + 8);
      ctx.font = `300 19px ${SANS}`;
      ctx.fillStyle = C.ink3;
      ctx.fillText("向 外 观 察 · 第 一 印 象 报 告", 108, headY + 44);
    }

    // 分隔线
    ctx.beginPath();
    ctx.moveTo(108, 205);
    ctx.lineTo(W - 108, 205);
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ---- 断言 ----
    ctx.textAlign = "left";
    ctx.font = `400 54px ${SERIF}`;
    const hlLines = wrap(ctx, data.headline || "", W - 216);
    let y = 300;
    hlLines.slice(0, 4).forEach((ln) => {
      ctx.fillStyle = /「|“/.test(ln) ? C.gold : C.ink;
      ctx.fillText(ln, 108, y);
      y += 76;
    });

    // ---- 落差指数 + 雷达 ----
    const blockY = y + 50;

    // 左：数字
    ctx.font = `300 22px ${SANS}`;
    ctx.fillStyle = C.gold;
    ctx.letterSpacing = "4px";
    ctx.fillText("落 差 指 数", 108, blockY + 8);
    ctx.letterSpacing = "0px";

    ctx.font = `400 150px ${SERIF}`;
    ctx.fillStyle = C.gold;
    ctx.fillText(String(gap), 100, blockY + 145);
    const numW = ctx.measureText(String(gap)).width;
    ctx.font = `300 40px ${SERIF}`;
    ctx.fillStyle = "rgba(201,169,106,0.55)";
    ctx.fillText("%", 104 + numW, blockY + 118);

    // 解释文案（折行）
    ctx.font = `300 24px ${SANS}`;
    ctx.fillStyle = C.ink2;
    const expLines = wrap(ctx, "别人读到的你，和你理解的自己，\n" + (window.gapWord(gap) || ""), 340);
    let ey = blockY + 195;
    expLines.slice(0, 4).forEach((ln) => {
      ctx.fillStyle = ln.includes("你理解的自己") ? C.ink3 : C.ink2;
      ctx.fillText(ln, 108, ey);
      ey += 38;
    });

    // 右：雷达
    drawRadar(ctx, 760, blockY + 130, 128, otherArr, selfArr, DIMS.map((d) => d.name));

    // 图例
    const lgY = blockY + 300;
    ctx.font = `300 21px ${SANS}`;
    ctx.fillStyle = C.gold;
    ctx.fillRect(560, lgY - 7, 22, 3);
    ctx.fillStyle = C.ink2;
    ctx.fillText("别人读到的你", 592, lgY);
    ctx.strokeStyle = C.blue;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(770, lgY - 6);
    ctx.lineTo(792, lgY - 6);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.ink2;
    ctx.fillText("你理解的自己", 804, lgY);

    // ---- 标签 ----
    const tagY = blockY + 370;
    let tx = 108;
    ctx.font = `300 26px ${SANS}`;
    (data.tags || []).slice(0, 3).forEach((t) => {
      const w = ctx.measureText(t).width + 52;
      if (tx + w > W - 108) return;
      roundRect(ctx, tx, tagY, w, 54, 27);
      ctx.fillStyle = "rgba(201,169,106,0.09)";
      ctx.fill();
      ctx.strokeStyle = "rgba(201,169,106,0.38)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = C.gold;
      ctx.textAlign = "center";
      ctx.fillText(t, tx + w / 2, tagY + 36);
      ctx.textAlign = "left";
      tx += w + 18;
    });

    // ---- 一句话 ----
    const closeY = tagY + 60;
    roundRect(ctx, 108, closeY, W - 216, 232, 3);
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = `400 40px ${SERIF}`;
    ctx.textAlign = "center";
    const cLines = wrap(ctx, data.closing || "", W - 320);
    let cyy = closeY + 100 - (cLines.length - 1) * 28;
    cLines.slice(0, 3).forEach((ln) => {
      ctx.fillStyle = C.ink;
      ctx.fillText(ln, W / 2, cyy);
      cyy += 60;
    });

    // ---- 页脚 ----
    ctx.textAlign = "center";
    ctx.font = `300 22px ${SANS}`;
    ctx.fillStyle = C.ink3;
    ctx.fillText("这是 AI 对「陌生人的第一眼读法」的模拟，不是对你的评价", W / 2, H - 118);

    ctx.font = `400 26px ${SERIF}`;
    ctx.fillStyle = C.gold;
    ctx.fillText("初 见 雷 达", W / 2, H - 72);

    return cv;
  };

  /* 触发下载（移动端部分浏览器不支持，降级为长按提示） */
  window.downloadShareCard = function (cv, name) {
    try {
      cv.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name || "初见雷达.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }, "image/png");
    } catch (e) {
      console.error(e);
    }
  };
})();
