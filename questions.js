/* 初见雷达：不是测美丑，而是模拟陌生人对你的第一眼归类。 */
window.DIMS = [
  { key: "distance", name: "距离感", hi: "让人想靠近", lo: "需要一个开场信号" },
  { key: "warmth", name: "亲和力", hi: "容易接上话", lo: "熟了以后更明显" },
  { key: "trust", name: "靠谱感", hi: "像是能把事交给你", lo: "要靠相处建立" },
  { key: "presence", name: "存在感", hi: "进场就会被注意", lo: "容易先观察再发光" },
  { key: "chat", name: "好聊感", hi: "别人愿意继续聊", lo: "需要找到共同话题" },
  { key: "memory", name: "记忆点", hi: "见过一次也记得", lo: "相处后才显出来" },
  { key: "boundary", name: "边界感", hi: "分寸舒服", lo: "容易被试探距离" },
];

window.QUESTIONS = [
  { dim: "distance", text: "第一次进一个全是陌生人的群聊，你通常会先看一会儿，再决定要不要说话。" },
  { dim: "warmth", text: "聚会冷场时，你能自然地接一句话，让场子重新动起来。" },
  { dim: "trust", text: "第一次合作，别人常常会直接把具体的事交代给你，而不是只让你旁听。" },
  { dim: "presence", text: "你走进饭局、会议室或教室时，通常会有人抬头看你一眼。" },
  { dim: "chat", text: "刚认识的人聊不到三句，就会开始跟你说自己的近况或小秘密。" },
  { dim: "memory", text: "只见过一次的人，下一次还能记得你，或者主动叫出你的名字。" },
  { dim: "boundary", text: "第一次见面时，你很少为了让大家喜欢自己而过度解释或迎合。" },
];

window.OPTIONS = [
  { label: "完全不像", value: 30 },
  { label: "偶尔会", value: 50 },
  { label: "经常是", value: 70 },
  { label: "太像了", value: 88 },
];
