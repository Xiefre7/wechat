var fs=require("fs");

// Restore from backup  
var backup=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js.bak");
fs.writeFileSync("cloudfunctions/quickstartFunctions/index.js", backup);

var buf=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js");
var content=buf.toString("utf8");
content=content.replace(/^\uFEFF/,"");
var lines=content.split("\n");

// Count all backticks
var totalBt=0;
for(var i=0;i<lines.length;i++){
  var btCount=(lines[i].match(/`/g)||[]).length;
  totalBt+=btCount;
}
console.log("Total backticks: "+totalBt+" (should be even: "+(totalBt%2===0)+")");

// Count single quotes (check for issues)
// Count all single quotes not in comments
var inBlockComment=false;
var inLineComment=false;
var inString=false;
var quoteCount=0;
for(var i=0;i<lines.length;i++){
  var l=lines[i];
  inLineComment=false;
  for(var j=0;j<l.length;j++){
    if(inBlockComment){
      if(l[j]==="*" && j+1<l.length && l[j+1]==="/"){ inBlockComment=false; j++; }
      continue;
    }
    if(inLineComment) break;
    if(l[j]==="/" && j+1<l.length && l[j+1]==="*"){ inBlockComment=true; j++; continue; }
    if(l[j]==="/" && j+1<l.length && l[j+1]==="/"){ inLineComment=true; continue; }
    if(!inString && l[j]==="'"){
      quoteCount++;
    }
  }
}
console.log("Single quotes (approximate): "+quoteCount);

// Check specific case: the "?" issue
// Find all lines with errMsg that end with ? + ...
for(var i=0;i<lines.length;i++){
  var l=lines[i];
  if(l.indexOf("errMsg")>=0){
    // Find the value string
    var m=l.match(/errMsg:\s*['`]([^'`]*)['`]/);
    if(!m){
      // Check if the string doesn"t have a closing quote
      var qIdx=l.indexOf("errMsg:");
      var rest=l.substring(qIdx);
      var openQ=rest.match(/['`]/);
      if(openQ){
        var qChar=openQ[0];
        var qStart=qIdx+openQ.index;
        var closeIdx=l.indexOf(qChar, qStart+1);
        if(closeIdx<0){
          console.log("Line "+(i+1)+": UNTERMINATED string after errMsg: "+l.substring(0,60).trim());
        }
      }
    }else{
      // Check if the value has suspicious garbled chars
      var val=m[1];
      for(var ci=0;ci<val.length;ci++){
        var code=val.charCodeAt(ci);
        if(code>=0xE000 && code<=0xF8FF){
          console.log("Line "+(i+1)+": Suspicious PUA char U+"+code.toString(16)+" in errMsg value");
          break;
        }
        if(code===0x3F && ci===val.length-1){
          // The ? at the end might be fine if it"s actually a question mark
        }
      }
    }
  }
}
