var fs=require("fs");
var buf=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js");
var lines=[];
var start=0;
for(var i=0;i<buf.length;i++){
  if(buf[i]===10){ lines.push(buf.slice(start,i)); start=i+1; }
}
lines.push(buf.slice(start));
fs.writeFileSync("C:/Users/32804/AppData/Local/Temp/line172.js", lines[171]);
console.log("Written");
