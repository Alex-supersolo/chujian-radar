/* 初见雷达 · 前端配置
 *
 * apiBase：AI 代理地址（阿里云函数计算 / Cloudflare Worker 的 URL，不要带结尾斜杠）。
 *   - 留空 + 本地打开（localhost）→ 走同源 /api/analyze（node server.mjs 提供）
 *   - 留空 + 线上（GitHub Pages）  → 演示模式，返回示例报告，不调用 AI
 *
 * ⚠️ 永远不要把 API Key 写在这里：GitHub Pages 上的一切都是公开的。
 */
window.CJLD_CONFIG = {
  apiBase: "",
};
