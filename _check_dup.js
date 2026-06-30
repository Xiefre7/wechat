var fs = require('fs');
var c = fs.readFileSync('C:/Users/32804/WeChatProjects/miniprogram-1/miniprogram/pages/bank/import-preview/index.wxml', 'utf8');

// Find stem fields
var f1 = 'data-field="stem"';
var idx = -1;
while ((idx = c.indexOf(f1, idx + 1)) !== -1) {
  console.log('stem at ' + idx + ': ' + c.substring(Math.max(0,idx-30), idx+30));
}

// Find explanation fields
var f2 = 'data-field="explanation"';
idx = -1;
while ((idx = c.indexOf(f2, idx + 1)) !== -1) {
  console.log('explanation at ' + idx + ': ' + c.substring(Math.max(0,idx-30), idx+30));
}