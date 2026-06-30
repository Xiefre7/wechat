var fs=require("fs");
var c=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js","utf8");
c=c.replace(/^\uFEFF/,"");
var lines=c.split("\n");
var l=lines[296];
console.log("Line 297 current: "+JSON.stringify(l));
