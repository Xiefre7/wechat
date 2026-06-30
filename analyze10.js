var fs=require("fs");
var c=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js","utf8");
c=c.replace(/^\uFEFF/,"");
var lines=c.split("\n");
var l=lines[171];

// Find the first and last single quote
var firstQ=l.indexOf("'");
var lastQ=l.lastIndexOf("'");
console.log("First quote at: "+firstQ+", Last quote at: "+lastQ);
if(firstQ>=0 && lastQ>firstQ){
  var strContent=l.substring(firstQ+1, lastQ);
  console.log("String content length: "+strContent.length);
  console.log("String content chars:");
  for(var i=0;i<strContent.length;i++){
    console.log("  char "+i+": U+"+strContent.charCodeAt(i).toString(16)+" = '"+strContent[i]+"'");
  }
}
