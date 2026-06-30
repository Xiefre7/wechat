var fs=require("fs");
var buf=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js");
var searchBuf=Buffer.from([0xe6,0xa3,0xb0,0xe6,0xa6,0x92]); // ?? in UTF-8 bytes
console.log("Search hex: "+searchBuf.toString("hex"));
var idx=0;
var found=-1;
while(idx<buf.length){
  var match=true;
  for(var j=0;j<searchBuf.length;j++){
    if(idx+j>=buf.length || buf[idx+j]!==searchBuf[j]){match=false;break;}
  }
  if(match){found=idx;break;}
  idx++;
}
console.log("Found at: "+found);
