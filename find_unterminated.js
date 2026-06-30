var fs=require("fs");
var backup=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js.bak");
var content=backup.toString("utf8");
content=content.replace(/^\uFEFF/,"");
var lines=content.split("\n");

// Find all lines with errMsg with potential unterminated strings
for(var i=0;i<lines.length;i++){
  var l=lines[i];
  // Find errMsg in the line
  var idx=l.indexOf("errMsg");
  if(idx>=0){
    // Find the quote character after errMsg
    var quoteIdx=l.indexOf("'", idx);
    var backtickIdx=l.indexOf("`", idx);
    var quoteChar=quoteIdx>=0 && (backtickIdx<0 || quoteIdx<backtickIdx) ? "'" : "`";
    var startIdx=quoteIdx>=0 ? quoteIdx : backtickIdx;
    if(startIdx<0) continue;
    
    // Find the closing quote in the remaining line
    var searchFrom=startIdx+1;
    var closeIdx=-1;
    if(quoteChar==="'"){
      closeIdx=l.indexOf("'", searchFrom);
    }else{
      closeIdx=l.indexOf("`", searchFrom);
    }
    
    if(closeIdx<0){
      console.log("Line "+(i+1)+": UNTERMINATED "+quoteChar+" string");
      console.log("  Content: "+l.substring(0,80).trim());
    }
  }
}
