var fs=require("fs");
var c=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js","utf8");
c=c.replace(/^\uFEFF/,"");
var lines=c.split("\n");
var l=lines[171];
// Print using Buffer to avoid console encoding issues
console.log("Line as buffer hex:");
console.log(Buffer.from(l,"utf16le").toString("hex"));
// Find single quote positions
for(var i=0;i<l.length;i++){
  if(l[i]==="'"){
    console.log("Found single quote at position "+i+" charCode="+l.charCodeAt(i)+" prev="+(i>0?l.charCodeAt(i-1):"none")+" next="+l.charCodeAt(i+1));
  }
}
