var fs=require("fs");
var buf=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js");
// Remove BOM
var content=buf.slice(3).toString("utf8");
// Check for }const pattern
var matches=content.match(/\}const/g);
console.log("Found "+matches.length+" occurrences of }const");

// Also check for garbled errMsg strings
var lines=content.split("\n");
var issues=[];
for(var i=0;i<lines.length;i++){
  var l=lines[i];
  // Check for strings with mixed valid/invalid chars
  if(l.indexOf("errMsg")>=0){
    var m=l.match(/errMsg:\s*'\$([^"]+)'\s*(?:,|\})/);
    // Check if the string contains chars outside BMP or has encoding artifacts
    for(var j=0;j<l.length;j++){
      var code=l.charCodeAt(j);
      if(code>=0xD800 && code<=0xDFFF){
        issues.push({line:i+1,pos:j,code:code.toString(16),msg:"Surrogate pair"});
      }
    }
  }
}
console.log("Found "+issues.length+" encoding issues");
issues.forEach(function(i){ console.log("Line "+i.line+" pos "+i.pos+" code "+i.code+" "+i.msg); });
