var fs=require("fs");
// Check the raw bytes at line 297 in the current file
var buf=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js");
var lines=[];
var start=0;
for(var i=0;i<buf.length;i++){
  if(buf[i]===10){
    lines.push({start:start, end:i, data:buf.slice(start,i)});
    start=i+1;
  }
}
lines.push({start:start, end:buf.length, data:buf.slice(start)});

var l=lines[296];
console.log("Line 297 bytes from "+l.start+" to "+l.end);
console.log("Hex: "+l.data.toString("hex"));
console.log("UTF8: "+l.data.toString("utf8"));

// Check if there is a 60 (backtick) in the last 10 bytes
var lastBytes=l.data.slice(-10);
console.log("Last 10 bytes: "+lastBytes.toString("hex"));
var btIdx=lastBytes.indexOf(0x60);
console.log("Backtick found at offset "+(btIdx>=0?btIdx:"not found")+" from end");
