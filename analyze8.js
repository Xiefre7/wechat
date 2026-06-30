var fs=require("fs");
var buf=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js");
var content=buf.toString("utf8");

// Find specific pattern on line 172
var lines=content.split("\n");
var l171=lines[171];
console.log("Line 172: "+l171);
console.log("");

// The issue is clear: the file has encoding corruption.
// Rather than trying to repair every corrupted string (which would require 
// knowing the original for each one), the BEST strategy for this specific 
// bug report (Word import failure) is to:

// 1. Fix the }const issue (line 697)
// 2. Remove/rewrite the corrupted Chinese strings in errMsg fields
//    that cause SyntaxError in WeChat cloud environment

// Specifically, line 172: return { success: false, errMsg: "..." };
// We need to replace the corrupted string with a simpler ASCII message

var fixedLines=[];
for(var i=0;i<lines.length;i++){
  var l=lines[i];
  // Fix }const -> newline + const
  l=l.replace(/\}const/g, "}\nconst");
  fixedLines.push(l);
}

var fixed=fixedLines.join("\n");
fs.writeFileSync("fixed_index.js", fixed);
console.log("Fixed file written. Checking syntax...");
