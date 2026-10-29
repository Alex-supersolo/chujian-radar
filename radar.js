/* 雷达图：纯 SVG，无依赖
 * 金色实心多边形 = 别人读到的你（other）
 * 蓝色虚线圈   = 你理解的自己（self）
 */
(function () {
  const NS = "http://www.w3.org/2000/svg";

  function pt(cx, cy, r, angle, val) {
    const rr = (r * val) / 100;
    return [cx + Math.cos(angle) * rr, cy + Math.sin(angle) * rr];
  }

  function polyStr(cx, cy, r, angles, vals) {
    return vals
      .map((v, i) => {
        const [x, y] = pt(cx, cy, r, angles[i], v);
        return x.toFixed(2) + "," + y.toFixed(2);
      })
      .join(" ");
  }

  function el(name, attrs) {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  window.renderRadar = function (host, opts) {
    const other = opts.other;   // [7] 0-100
    const self = opts.self;     // [7] 0-100
    const labels = opts.labels; // [7]
    const n = other.length;

    const W = 360, H = 330;
    const cx = W / 2, cy = H / 2 - 4;
    const R = 118;

    const svg = el("svg", {
      viewBox: `0 0 ${W} ${H}`,
      class: "radar-svg",
      role: "img",
      "aria-label": "第一印象雷达图，金色为他人视角，蓝色为自我认知",
    });

    const angles = [];
    for (let i = 0; i < n; i++) {
      angles.push((-Math.PI / 2) + (i * 2 * Math.PI) / n);
    }

    // 同心网格（4 层）
    [25, 50, 75, 100].forEach((lv, idx) => {
      const pts = angles
        .map((a) => {
          const [x, y] = pt(cx, cy, R, a, lv);
          return x.toFixed(2) + "," + y.toFixed(2);
        })
        .join(" ");
      svg.appendChild(
        el("polygon", {
          points: pts,
          fill: "none",
          stroke: idx === 3 ? "rgba(75,62,73,0.16)" : "rgba(75,62,73,0.08)",
          "stroke-width": 1,
        })
      );
    });

    // 轴线
    angles.forEach((a) => {
      const [x, y] = pt(cx, cy, R, a, 100);
      svg.appendChild(
        el("line", {
          x1: cx, y1: cy, x2: x, y2: y,
          stroke: "rgba(75,62,73,0.08)",
          "stroke-width": 1,
        })
      );
    });

    // 自评（蓝色虚线，无填充）
    const selfPoly = el("polygon", {
      points: polyStr(cx, cy, R, angles, self.map(() => 0)),
      fill: "none",
      stroke: "#6D9CC8",
      "stroke-width": 1.4,
      "stroke-dasharray": "4 4",
      "stroke-linejoin": "round",
      opacity: 0.9,
    });
    svg.appendChild(selfPoly);

    // 他人（金色填充）
    const otherPoly = el("polygon", {
      points: polyStr(cx, cy, R, angles, other.map(() => 0)),
      fill: "rgba(201,169,106,0.16)",
      stroke: "#F26B5E",
      "stroke-width": 1.8,
      "stroke-linejoin": "round",
    });
    svg.appendChild(otherPoly);

    // 顶点圆点（他人）
    const dots = other.map(() => {
      const c = el("circle", {
        r: 2.6,
        fill: "#F26B5E",
        cx: cx,
        cy: cy,
      });
      svg.appendChild(c);
      return c;
    });

    // 轴标签
    angles.forEach((a, i) => {
      const [lx, ly] = pt(cx, cy, R + 26, a, 100);
      const cos = Math.cos(a);
      let anchor = "middle";
      if (cos > 0.32) anchor = "start";
      else if (cos < -0.32) anchor = "end";

      const t = el("text", {
        x: lx.toFixed(1),
        y: (ly + 4).toFixed(1),
        "text-anchor": anchor,
        fill: "#A8A29A",
        "font-size": 11.5,
        "font-family": '"PingFang SC","Hiragino Sans GB",sans-serif',
        "letter-spacing": "0.04em",
      });
      t.textContent = labels[i];
      svg.appendChild(t);

      // 他人读数（小号金色）
      const v = el("text", {
        x: lx.toFixed(1),
        y: (ly + 17).toFixed(1),
        "text-anchor": anchor,
        fill: "rgba(201,169,106,0.75)",
        "font-size": 9.5,
        "font-family": '"Songti SC",Georgia,serif',
        "font-variant-numeric": "tabular-nums",
      });
      v.textContent = Math.round(other[i]);
      svg.appendChild(v);
    });

    host.innerHTML = "";
    host.appendChild(svg);

    // 从中心展开的动画
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      otherPoly.setAttribute("points", polyStr(cx, cy, R, angles, other));
      selfPoly.setAttribute("points", polyStr(cx, cy, R, angles, self));
      dots.forEach((d, i) => {
        const [x, y] = pt(cx, cy, R, angles[i], other[i]);
        d.setAttribute("cx", x); d.setAttribute("cy", y);
      });
      return;
    }

    const DUR = 1000;
    const t0 = performance.now();
    function frame(now) {
      const raw = Math.min(1, (now - t0) / DUR);
      const p = 1 - Math.pow(1 - raw, 3); // easeOutCubic
      const oP = other.map((v) => v * p);
      const sP = self.map((v) => v * p);
      otherPoly.setAttribute("points", polyStr(cx, cy, R, angles, oP));
      selfPoly.setAttribute("points", polyStr(cx, cy, R, angles, sP));
      dots.forEach((d, i) => {
        const [x, y] = pt(cx, cy, R, angles[i], oP[i]);
        d.setAttribute("cx", x);
        d.setAttribute("cy", y);
      });
      if (raw < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };
})();
