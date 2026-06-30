var fs=require("fs");
var content=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js","utf8");
content=content.replace(/^\uFEFF/,"");
var lines=content.split("\n");
// Show lines 755-765
for(var i=754;i<765;i++){
  console.log("Line "+(i+1)+": "+JSON.stringify(lines[i]));
}
