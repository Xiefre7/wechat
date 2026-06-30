var fs=require("fs");
var buf=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js");
var content=buf.toString("utf8");
content=content.replace(/^\uFEFF/,"");
var lines=content.split("\n");

// Check line 187
var l=lines[186];
console.log("Line 187: "+JSON.stringify(l));
// Check backtick balance on this line
var btCount=(l.match(/`/g)||[]).length;
console.log("Backtick count: "+btCount);

// Also check for other lines with backticks that might span
var openTemplate=false;
var openLine=0;
for(var i=0;i<lines.length;i++){
  var bt=(lines[i].match(/`/g)||[]).length;
  if(bt%2===1){
    if(!openTemplate){
      openTemplate=true;
      openLine=i+1;
    }else{
      openTemplate=false;
    }
  }
}
console.log("Check all: openTemplate="+openTemplate+", started at line "+openLine);
