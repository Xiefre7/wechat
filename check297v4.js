var fs=require("fs");
var content=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js","utf8");
content=content.replace(/^\uFEFF/,"");
var lines=content.split("\n");
console.log("Line 297: "+JSON.stringify(lines[296]));

// Show hex bytes of line 297
var buf=Buffer.from(lines[296],"utf8");
console.log("Hex:");
for(var i=0;i<buf.length;i+=16){
  var hex=[];
  for(var j=i;j<Math.min(i+16,buf.length);j++){
    hex.push(buf[j].toString(16).padStart(2,"0"));
  }
  console.log(hex.join(" ")+"  |  pos "+i+" to "+Math.min(i+15,buf.length-1));
}
