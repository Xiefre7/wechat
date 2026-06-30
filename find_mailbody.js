var fs=require("fs");
var content=fs.readFileSync("cloudfunctions/quickstartFunctions/index.js","utf8");
content=content.replace(/^\uFEFF/,"");
var lines=content.split("\n");

// Show lines 740-770 with backtick marking
for(var i=739;i<770;i++){
  var l=lines[i];
  var btCount=(l.match(/`/g)||[]).length;
  var markers="";
  for(var j=0;j<l.length;j++){
    if(l[j]==="`"){
      // Find the position in the JSON string
      var jsonPos=JSON.stringify(l.substring(0,j+1)).length-2;
      while(markers.length<jsonPos) markers+=" ";
      markers+="^";
    }
  }
  console.log("Line "+(i+1)+": "+JSON.stringify(l)+(btCount>0?" ["+btCount+" bt]":"")+"\n         "+markers);
}
