var fs=require("fs");
var buf=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js");
var content=buf.toString("utf8");
content=content.replace(/^\uFEFF/,"");
var lines=content.split("\n");

// Show lines 290-310 to understand context
for(var i=289;i<310;i++){
  console.log("Line "+(i+1)+": "+JSON.stringify(lines[i]));
}
