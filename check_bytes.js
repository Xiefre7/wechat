var fs=require("fs");
var buf=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js");
// Find "??" byte sequence
var search=Buffer.from("??","utf8");
console.log("Search hex: "+search.toString("hex"));
var idx=buf.indexOf(search);
console.log("Found at offset: "+idx);
if(idx>=0){
  console.log("Bytes before: "+buf.slice(idx-5,idx).toString("hex"));
  console.log("Bytes at match: "+buf.slice(idx,idx+search.length+5).toString("hex"));
  // The fix: replace the ? e6 a6 92 with backtick 60
  // Actually, let me just insert a backtick before the };
  var afterIdx=idx+search.length;
  console.log("After bytes: "+buf.slice(afterIdx,afterIdx+5).toString("hex"));
}
