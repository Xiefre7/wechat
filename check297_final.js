var fs=require("fs");
// Check line 297 in the fixed file
var buf=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js");
var content=buf.toString("utf8");
content=content.replace(/^\uFEFF/,"");
var lines=content.split("\n");
var l=lines[296];
console.log("Line 297: "+JSON.stringify(l));

// Extract just the template literal  
var m=l.match(/errMsg:\s*(`[^`]*`)/);
if(m){
  console.log("Template literal: "+JSON.stringify(m[1]));
  // Try to eval it
  var code="function f(){ return { success: false, errMsg: "+m[1]+" }; }";
  try{
    new Function(code);
    console.log("Parses OK!");
  }catch(e){
    console.log("Parse error: "+e.message);
    // Show individual chars of the template
    for(var ci=0;ci<m[1].length;ci++){
      console.log("  char "+ci+": U+"+m[1].charCodeAt(ci).toString(16)+" = "+JSON.stringify(m[1][ci]));
    }
  }
}else{
  console.log("Could not extract template literal");
  // Try to find the pattern
  var bt1=l.indexOf("`");
  var bt2=l.indexOf("`", bt1+1);
  console.log("Backtick 1 at: "+bt1+", backtick 2 at: "+bt2);
  console.log("Content between: "+JSON.stringify(l.substring(bt1+1, bt2)));
}
