// The issue: Chinese chars stored as UTF-8 bytes were decoded as Latin-1/Western, 
// then the result was saved as UTF-8. This creates "double encoding" artifacts.
// Let me check if we can detect the pattern

var fs=require("fs");
var buf=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js");
// Remove BOM
buf=buf.slice(3);

// The line 172 contains: errMsg: "?????????????????"
// "?????????????????" should be "???????????"
// Let me verify by looking at the raw bytes of the known-good Chinese text

// Known correct: ???????????
var correct="???????????";
console.log("Correct UTF-8 bytes: "+Buffer.from(correct).toString("hex"));

// Now find the actual bytes in the file
var idx=buf.indexOf(Buffer.from("errMsg"));
if(idx>=0){
  console.log("Found errMsg at byte offset "+idx);
  // Show next 60 bytes
  var snippet=buf.slice(idx, idx+80);
  console.log("Snippet hex: "+snippet.toString("hex"));
  console.log("Snippet utf8: "+snippet.toString("utf8"));
}
