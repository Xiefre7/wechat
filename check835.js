var fs=require("fs");
var buf=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js");
var str=buf.toString("utf8");
str=str.replace(/^\uFEFF/,"");
var lines=str.split("\n");
console.log("Line 835 hex:");
var l=lines[834];
for(var i=0;i<l.length;i++){
  console.log("  pos "+i+": U+"+l.charCodeAt(i).toString(16)+" = '"+l[i]+"'");
}
