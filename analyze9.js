var fs=require("fs");
var c=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js","utf8");
c=c.replace(/^\uFEFF/,"");
var lines=c.split("\n");

// Line 172: extract the errMsg value
var l=lines[171];
console.log("Line 172: "+JSON.stringify(l));

// Check for any embedded quote in the string  
var inStr=false;
var chars=[];
for(var i=0;i<l.length;i++){
  if(l[i]==="'" && !inStr) { inStr=true; continue; }
  if(l[i]==="'" && inStr) { 
    console.log("String content: "+JSON.stringify(chars.join("")));
    console.log("String hex: "+Buffer.from(chars.join(""),"utf8").toString("hex"));
    break; 
  }
  if(inStr) chars.push(l[i]);
}
