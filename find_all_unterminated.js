var fs=require("fs");
var buf=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js");
var content=buf.toString("utf8");
content=content.replace(/^\uFEFF/,"");
var lines=content.split("\n");

// Find all lines with errMsg and check if they have a closing quote
for(var i=0;i<lines.length;i++){
  var l=lines[i];
  var errIdx=l.indexOf("errMsg:");
  if(errIdx<0) continue;
  
  var rest=l.substring(errIdx);
  var openQ=rest.match(/['`]/);
  if(!openQ) continue;
  var qChar=openQ[0];
  var qIdx=errIdx+openQ.index;
  
  // Search for closing quote from qIdx+1
  var closeIdx=-1;
  for(var j=qIdx+1;j<l.length;j++){
    if(l[j]===qChar && l[j-1]!=="\\"){
      closeIdx=j;
      break;
    }
  }
  
  if(closeIdx<0){
    console.log("Line "+(i+1)+": UNTERMINATED "+qChar+" - "+l.substring(0,80).trim());
  }
}
