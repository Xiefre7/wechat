var fs=require("fs");
var buf=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js");
var content=buf.slice(3).toString("utf8");
var lines=content.split("\n");
var suspicious=[];
for(var i=0;i<lines.length;i++){
  var l=lines[i];
  // Check for Chinese characters that look garbled (chars outside common CJK ranges)
  for(var j=0;j<l.length;j++){
    var code=l.charCodeAt(j);
    // CJK Unified Ideographs: U+4E00-U+9FFF
    // CJK Extension A: U+3400-U+4DBF
    // CJK Extension B: U+20000-U+2A6DF
    // Private Use Area: U+E000-U+F8FF (suspicious)
    if((code>=0xE000 && code<=0xF8FF) || (code>=0xF900 && code<=0xFAFF) || code===0xFFFD){
      suspicious.push({line:i+1,pos:j,code:code.toString(16),char:l[j],context:l.substring(Math.max(0,j-10),Math.min(l.length,j+10)).trim()});
      break;
    }
  }
}
console.log("Found "+suspicious.length+" suspicious characters");
suspicious.forEach(function(s){ console.log("Line "+s.line+" pos "+s.pos+" U+"+s.code+" char="+s.char+" context: "+s.context); });
