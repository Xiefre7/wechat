var fs=require("fs");
var buf=fs.readFileSync("C:/Users/32804/AppData/Local/Temp/check_cloudfn.js");
// Check for BOM
console.log("First 4 bytes: "+buf.slice(0,4).toString("hex"));
// Check line 297 area
var lines=[];
var start=0;
for(var i=0;i<buf.length;i++){
  if(buf[i]===10){ lines.push(start); start=i+1; }
}
lines.push(start);
console.log("Line 297 starts at byte: "+lines[296]);

// Read around line 297
var lineStart=lines[296];
var lineEnd=buf.indexOf(10, lineStart+1);
if(lineEnd<0) lineEnd=buf.length;
var lineBuf=buf.slice(lineStart, lineEnd);
console.log("Line 297 length: "+lineBuf.length);
console.log("Line 297 hex: "+lineBuf.toString("hex"));

// Check specific bytes for template literal delimiters
var backtickCount=0;
var singleQuoteCount=0;
var dollarCount=0;
for(var i=0;i<lineBuf.length;i++){
  if(lineBuf[i]===0x60) backtickCount++;
  if(lineBuf[i]===0x27) singleQuoteCount++;
  if(lineBuf[i]===0x24) dollarCount++;
}
console.log("Backticks: "+backtickCount+", Single quotes: "+singleQuoteCount+", Dollar signs: "+dollarCount);

// The line should have 2 backticks (open and close). Let me check
// Backtick positions:
var positions=[];
for(var i=0;i<lineBuf.length;i++){
  if(lineBuf[i]===0x60) positions.push(i);
}
console.log("Backtick positions: "+JSON.stringify(positions));
