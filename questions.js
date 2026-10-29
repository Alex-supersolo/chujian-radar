/* 七个维度 + 七道自评题
 * 题目刻意写成「具体行为 / 别人的反应」，而不是「你觉得自己 xx 吗」，
 * 这样自评不会全部挤在中间，落差才有意义。
 */
window.DIMS = [
  { key: "trust",     name: "端正感", hi: "别人愿意托付",     lo: "信任要慢慢攒" },
  { key: "warmth",    name: "表情柔和度", hi: "陌生人愿意搭话",   lo: "破冰成本高" },
  { key: "edge",      name: "视觉锐度", hi: "有锋芒，不被轻视", lo: "容易被当成软柿子" },
  { key: "presence",  name: "气场",   hi: "进门会被注意",     lo: "需要主动争取存在感" },
  { key: "composure", name: "松弛感", hi: "待在一起很舒服",   lo: "容易被读成紧绷" },
  { key: "memory",    name: "记忆点", hi: "见一面就被记住",   lo: "容易看完就忘" },
  { key: "clarity",   name: "正式感", hi: "一开口别人安静",   lo: "要靠内容证明自己" },
];

window.QUESTIONS = [
  { dim: "trust",     text: "我平时选择的照片，画面通常干净、端正。" },
  { dim: "warmth",    text: "我拍照时，表情通常柔和、自然。" },
  { dim: "edge",      text: "我偏好线条鲜明、对比强烈的造型。" },
  { dim: "presence",  text: "我喜欢在照片里成为视觉焦点。" },
  { dim: "composure", text: "我拍照时，肩颈和姿态通常比较放松。" },
  { dim: "memory",    text: "我的照片通常有鲜明的配色或造型特点。" },
  { dim: "clarity",   text: "我平时选择的照片，着装和场景通常偏正式。" },
];

window.OPTIONS = [
  { label: "完全不像我", value: 30 },
  { label: "偶尔",       value: 50 },
  { label: "挺常见",     value: 70 },
  { label: "就是我",     value: 88 },
];
