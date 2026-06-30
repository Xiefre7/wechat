var fs=require("fs");
var buf=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js");
var content=buf.toString("utf8");
content=content.replace(/^\uFEFF/,"");
var lines=content.split("\n");

// Check line 297
var l=lines[296];
console.log("Line 297: "+JSON.stringify(l));
// Show bytes
console.log("Line 297 hex:");
for(var i=0;i<l.length;i++){
  console.log("  char "+i+": U+"+l.charCodeAt(i).toString(16)+" = '"+l[i]+"'");
}
