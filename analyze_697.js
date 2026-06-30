var fs=require("fs");
var buf=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js");
// Check around line 697
var lines=[];
var start=0;
for(var i=0;i<buf.length;i++){
  if(buf[i]===10){ lines.push(buf.slice(start,i)); start=i+1; }
}
lines.push(buf.slice(start));
console.log("Line 696: "+lines[695].toString("utf8"));
console.log("Line 697: "+lines[696].toString("utf8"));
console.log("Line 698: "+lines[697].toString("utf8"));
