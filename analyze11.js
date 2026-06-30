var fs=require("fs");
var buf=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js");
var lines=[];
var start=0;
for(var i=0;i<buf.length;i++){
  if(buf[i]===10){ lines.push(buf.slice(start,i)); start=i+1; }
}
lines.push(buf.slice(start));

var l=lines[171];
console.log("Line 172 raw bytes:");
for(var i=0;i<l.length;i++){
  console.log("  byte "+i+": 0x"+l[i].toString(16)+" = "+(l[i]>=32&&l[i]<=126?String.fromCharCode(l[i]):"?"));
}
