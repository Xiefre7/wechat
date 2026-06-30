var fs = require('fs');
var c = fs.readFileSync('C:/Users/32804/WeChatProjects/miniprogram-1/miniprogram/pages/bank/import-preview/index.wxml', 'utf8');

// Find the options section
var optSec = c.indexOf('edit-opts');
var qSec = c.indexOf('答案', optSec);
console.log('OPTIONS SECTION:');
console.log(c.substring(optSec - 30, qSec + 200));