const fs = require("fs");
const SQ = String.fromCharCode(39);
const BT = String.fromCharCode(96);
const buf = fs.readFileSync("cloudfunctions/quickstartFunctions/index.js.bak");
const content = buf.toString("utf8").replace(/^\uFEFF/, "");
const lines = content.split("\n");
console.log("Lines: " + lines.length);

// Check lines with backtick imbalance
let totalBT = 0;
for (let i = 0; i < lines.length; i++) {
  let l = lines[i];
  for (let ci = 0; ci < l.length; ci++) if (l[ci] === BT) totalBT++;
}
console.log("Total backticks: " + totalBT + " (even: " + (totalBT % 2 === 0) + ")");

// Check errMsg lines
for (let i = 0; i < lines.length; i++) {
  let l = lines[i];
  let m = l.match(/errMsg:\s*(['`])/);
  if (m) {
    let q = m[1];
    let o = m.index + m[0].length - 1;
    let c = l.indexOf(q, o + 1);
    if (c < 0) console.log("Line " + (i + 1) + ": errMsg unterminated " + q);
  }
}

// Check lines with odd single quotes
for (let i = 0; i < lines.length; i++) {
  let l = lines[i];
  let sq = 0;
  for (let ci = 0; ci < l.length; ci++) if (l[ci] === SQ && (ci === 0 || l[ci - 1] !== "\\")) sq++;
  if (sq % 2 === 1) console.log("Line " + (i + 1) + ": odd single quotes");
}

// Check lines with odd backticks
for (let i = 0; i < lines.length; i++) {
  let l = lines[i];
  let bt = 0;
  for (let ci = 0; ci < l.length; ci++) if (l[ci] === BT) bt++;
  if (bt % 2 === 1) console.log("Line " + (i + 1) + ": odd backticks");
}
