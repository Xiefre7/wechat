var fs=require("fs");
var buf=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js");
var content=buf.toString("utf8");
content=content.replace(/^\uFEFF/,"");
var lines=content.split("\n");
var l=lines[296];
console.log("Line 297: "+JSON.stringify(l));

// Show chars from position 70 onwards
for(var i=70;i<l.length;i++){
  console.log("  pos "+i+": U+"+l.charCodeAt(i).toString(16)+" = '"+l[i]+"'");
}
