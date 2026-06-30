var fs=require('fs');var c=fs.readFileSync('cloudfunctions/quickstartFunctions/index.js','utf8');c=c.replace(/^\uFEFF/,'');var lines=c.split('\n');console.log(JSON.stringify(lines[186]));
