var fs=require("fs");
var buf=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js");
var content=buf.toString("utf8");
content=content.replace(/^\uFEFF/,"");
var lines=content.split("\n");

// Check for "$" in single-quoted strings before line 297
// This could cause "Unexpected identifier" if "$" is interpreted
// as a template literal interpolation inside a string that is 
// actually a template that spans multiple lines

// Check lines 160-295 for any string with ${ that might be unterminated
for(var i=159;i<296;i++){
  var l=lines[i];
  // Check if line has $ { } combination
  if(l.indexOf("$")>=0){
    console.log("Line "+(i+1)+" has $: "+JSON.stringify(l));
  }
}
