var fs=require("fs");
var c=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js","utf8");
c=c.replace(/^\uFEFF/,"");
var lines=c.split("\n");
var l=lines[171];
// Extract the string inside quotes
var startQ=l.indexOf("'");
var endQ=l.lastIndexOf("'");
var inner=l.substring(startQ,endQ+1);
console.log("Inner string: "+inner);
// Try with Function
try{
  var code="    return { success: false, errMsg: "+inner+" };";
  var fn=new Function(code);
  console.log("Success: "+JSON.stringify(fn()));
}catch(e){
  console.log("Failed: "+e.message);
  // Try each char
  for(var i=0;i<inner.length;i++){
    var testInner=inner.substring(0,i+1)+"'";
    try{
      var code2="    return { success: false, errMsg: "+testInner+" };";
      new Function(code2);
    }catch(e2){
      console.log("Char "+i+" (U+"+inner.charCodeAt(i).toString(16)+") breaks it");
      break;
    }
  }
}
