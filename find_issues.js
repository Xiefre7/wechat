var fs=require("fs");
var buf=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js");
var content=buf.toString("utf8");
content=content.replace(/^\uFEFF/,"");
var lines=content.split("\n");

// Check line 176
var l=lines[175];
console.log("Line 176: "+JSON.stringify(l));

// Find all similar patterns - errMsg: "..." without proper closing
var issues=[];
for(var i=0;i<lines.length;i++){
  var line=lines[i];
  // Check lines with errMsg followed by single-quoted string ending with ? then space
  if(/errMsg:\s*'[^']*\?\s'\s*[,\}]/.test(line) || /errMsg:\s*'[^']*\?\s*[,\}]/.test(line)){
    issues.push({line:i+1, text:line.trim().substring(0,60)});
  }
}
console.log("Potential issues: "+issues.length);
issues.forEach(function(x){ console.log("Line "+x.line+": "+x.text); });
