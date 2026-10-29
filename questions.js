/* 七个维度 + 七道自评题
 * 题目刻意写成「具体行为 / 别人的反应」，而不是「你觉得自己 xx 吗」，
 * 这样自评不会全部挤在中间，落差才有意义。
 */
window.DIMS = [
  { key: "trust",     name: "可信度", hi: "别人愿意托付",     lo: "信任要慢慢攒" },
  { key: "warmth",    name: "亲和度", hi: "陌生人愿意搭话",   lo: "破冰成本高" },
  { key: "edge",      name: "攻击性", hi: "有锋芒，不被轻视", lo: "容易被当成软柿子" },
  { key: "presence",  name: "气场",   hi: "进门会被注意",     lo: "需要主动争取存在感" },
  { key: "composure", name: "松弛感", hi: "待在一起很舒服",   lo: "容易被读成紧绷" },
  { key: "memory",    name: "记忆点", hi: "见一面就被记住",   lo: "容易看完就忘" },
  { key: "clarity",   name: "专业度", hi: "一开口别人安静",   lo: "要靠内容证明自己" },
];

window.QUESTIONS = [
  { dim: "trust",     text: "第一次见面的人，会很快把手机、钥匙，或者一件私事交给你。" },
  { dim: "warmth",    text: "陌生人向你问路、跟你搭话的频率，比你身边的朋友高。" },
  { dim: "edge",      text: "有人说过你「看起来不好惹」，或者「不笑的时候有点凶」。" },
  { dim: "presence",  text: "你走进一个都是陌生人的房间，会有人停下来看你一眼。" },
  { dim: "composure", text: "等电梯、排队、突然冷场的时候，你不急着找点什么来填满它。" },
  { dim: "memory",    text: "只见过一面的人，下次还能叫出你的名字，或者记得你的样子。" },
  { dim: "clarity",   text: "你还没开口介绍自己，别人就默认你是「懂行的那个」。" },
];

window.OPTIONS = [
  { label: "完全不像我", value: 30 },
  { label: "偶尔",       value: 50 },
  { label: "挺常见",     value: 70 },
  { label: "就是我",     value: 88 },
];
