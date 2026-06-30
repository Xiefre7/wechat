var fs=require("fs");
var buf=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js");
var content=buf.toString("utf8");
content=content.replace(/^\uFEFF/,"");
var lines=content.split("\n");
var l=lines[296];
console.log("Line 297: "+JSON.stringify(l));
// Show last 20 chars
console.log("Last 20 chars:");
for(var i=l.length-20;i<l.length;i++){
  console.log("  pos "+i+": U+"+l.charCodeAt(i).toString(16)+" = '"+l[i]+"'");
}
