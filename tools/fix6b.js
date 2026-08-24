const fs = require("fs");
const path = "D:\\wzj\\jijiandzzd\\backend\\server.mjs";
let s = fs.readFileSync(path, "utf8");
const before = s.length;
// 匹配 ON DELETE CASCADE\n  )`\n);\n); (即 ON DELETE CASCADE 后紧跟多余的一个 ;)
// 用 global replace
s = s.replace(/ON DELETE CASCADE\n  \)\`\n\);\n\);\n/g, "ON DELETE CASCADE\n  )`\n);\n");
const after = s.length;
console.log("before:", before, "after:", after, "diff:", before - after);
fs.writeFileSync(path, s, "utf8");