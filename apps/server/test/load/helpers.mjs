// Artillery 辅助函数

const keywords = ["论语", "道德经", "易经", "诗经", "史记", "国学", "传统文化", "周易", "诗词", "书法"];
let keywordIndex = 0;

export function randomString(userContext, events, done) {
  const kw = keywords[keywordIndex % keywords.length];
  keywordIndex++;
  return kw;
}

export function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
