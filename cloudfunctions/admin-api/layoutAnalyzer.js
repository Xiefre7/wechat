/**
 * 导题斩题小工具 - 结构化 HTML 布局分析引擎 (Layout Analyzer)
 * 参考 docling (IBM) 版面分析思想，纯 JS 实现
 */
'use strict';

var LAYOUT_PATTERNS = { COLUMNAR: 1, LIST: 2, TABLE_EMBED: 3, MIXED: 4, PARAGRAPH: 5 };
var LP_NAMES = {}; LP_NAMES[1]='columnar'; LP_NAMES[2]='list'; LP_NAMES[3]='table_embed'; LP_NAMES[4]='mixed'; LP_NAMES[5]='paragraph';

function extractFeatures(html) {
  var f={hasTable:false,tableColCount:0,tableRowCount:0,hasOrderedList:false,hasUnorderedList:false,listItemCount:0,headings:[],headingLevels:[],paragraphTexts:[],paragraphLengths:[],hasBoldText:false,hasImages:false,imageCount:0,dominantPattern:LP_NAMES[LAYOUT_PATTERNS.PARAGRAPH]};
  if(!html)return f;
  f.hasTable=!!html.match(/<table[\s>]/gi);
  if(f.hasTable){var trs=html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi)||[];f.tableRowCount=trs.length;var mc=0;for(var t=0;t<trs.length;t++){var tc=(trs[t].match(/<td[^>]*>/gi)||[]).length;var hc=(trs[t].match(/<th[^>]*>/gi)||[]).length;mc=Math.max(mc,tc+hc)}f.tableColCount=mc}
  f.hasOrderedList=!!html.match(/<ol[\s>]/gi);f.hasUnorderedList=!!html.match(/<ul[\s>]/gi);var liM=html.match(/<li[^>]*>[\s\S]*?<\/li>/gi);f.listItemCount=liM?liM.length:0;
  var hM=html.match(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi);if(hM){for(var hi=0;hi<hM.length;hi++){var lv=hM[hi].match(/<h([1-6])/i);f.headingLevels.push(lv?parseInt(lv[1]):0);f.headings.push(hM[hi].replace(/<[^>]*>/g,'').trim())}}
  var pM=html.match(/<p[^>]*>(.*?)<\/p>/gi);if(pM){for(var pi=0;pi<pM.length;pi++){var pt=pM[pi].replace(/<[^>]*>/g,'').trim();if(pt){f.paragraphTexts.push(pt);f.paragraphLengths.push(pt.length)}}}
  f.hasBoldText=/<(b|strong|em)[\s>]/i.test(html);var imgM=html.match(/<img[^>]*>/gi);f.imageCount=imgM?imgM.length:0;f.hasImages=f.imageCount>0;
  if(f.hasTable&&f.tableColCount>=2&&f.tableRowCount>=2)f.dominantPattern=LP_NAMES[LAYOUT_PATTERNS.TABLE_EMBED];
  else if(f.hasOrderedList&&f.listItemCount>=4)f.dominantPattern=LP_NAMES[LAYOUT_PATTERNS.LIST];
  else if(f.paragraphTexts.length>=4){var sp=0;for(var i=0;i<f.paragraphLengths.length;i++){if(f.paragraphLengths[i]<30)sp++}if(sp>=4)f.dominantPattern=LP_NAMES[LAYOUT_PATTERNS.COLUMNAR];else if(f.headings.length>=1&&f.paragraphTexts.length>=3)f.dominantPattern=LP_NAMES[LAYOUT_PATTERNS.MIXED]}
  else if(f.headings.length>=1&&f.paragraphTexts.length>=3)f.dominantPattern=LP_NAMES[LAYOUT_PATTERNS.MIXED]
  return f
}

function scoreHypothesis(hypothesis,features,rawText){if(!hypothesis||!hypothesis.questions||hypothesis.questions.length===0)return 0;var sc=50;var qs=hypothesis.questions;var valid=0;for(var qi=0;qi<qs.length;qi++){var opts=qs[qi].options||[];if(opts.length>=2){var cont=true;for(var oi=0;oi<opts.length;oi++){if(opts[oi].key!==String.fromCharCode(65+oi)){cont=false;break}}if(cont)valid++}}sc+=10+Math.round((valid/Math.max(qs.length,1))*10);var ansCnt=0;for(var qi=0;qi<qs.length;qi++){var q=qs[qi];var ans=(q.answer||'').trim();if(!ans)continue;ansCnt++;if((q.type==='single_choice'||q.type==='multi_choice')&&/^[A-E][,\s、]*(?:[A-E])*$/.test(ans))sc+=2;else if(q.type==='true_false'&&/^[AB]$/i.test(ans))sc+=2;else if(q.type==='fill_blank'&&ans.length>=1)sc+=2}if(ansCnt>0)sc=Math.min(sc,85);if(rawText){var lines2=rawText.split('\n').filter(function(l){return l.trim()});var lpq=lines2.length/qs.length;if(lpq>=3&&lpq<=15)sc+=5;if((rawText.match(/答案/g)||[]).length>=qs.length*0.5)sc+=5}if(features){if(features.dominantPattern===LP_NAMES[LAYOUT_PATTERNS.TABLE_EMBED]&&features.tableRowCount-1<=qs.length+2)sc+=5;if(features.dominantPattern===LP_NAMES[LAYOUT_PATTERNS.LIST]&&features.listItemCount>=qs.length)sc+=5}return Math.min(100,Math.max(0,sc))}

function suggestParseStrategy(features){var c={tableMode:false,answerFirstDetection:false,lowerThreshold:false};if(features){if(features.dominantPattern===LP_NAMES[LAYOUT_PATTERNS.TABLE_EMBED])c.tableMode=true;if(features.dominantPattern===LP_NAMES[LAYOUT_PATTERNS.MIXED])c.answerFirstDetection=true;if(features.dominantPattern===LP_NAMES[LAYOUT_PATTERNS.PARAGRAPH]||features.dominantPattern===LP_NAMES[LAYOUT_PATTERNS.COLUMNAR])c.lowerThreshold=true}return c}

function enhancedHtmlToText(html){if(!html)return '';var t=html;
t=t.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi,function(m,c){var rows=(c.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi)||[]);var mc=0;var rd=rows.map(function(r){var cells=r.match(/<td[^>]*>([\s\S]*?)<\/td>/gi)||[];mc=Math.max(mc,cells.length);return cells.map(function(cell){return cell.replace(/<[^>]*>/g,'').trim()})});return'\n__TABLE__'+mc+'\n'+rd.map(function(r){return r.join('\t')}).join('\n')+'\n__ENDTABLE__\n'});
t=t.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi,function(m,c){var items=(c.match(/<li[^>]*>([\s\S]*?)<\/li>/gi)||[]);return'\n__OLIST__\n'+items.map(function(it,i){return'  '+(i+1)+'. '+it.replace(/<[^>]*>/g,'').trim()}).join('\n')+'\n__ENDOLIST__\n'});
t=t.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi,function(m,c){var items=(c.match(/<li[^>]*>([\s\S]*?)<\/li>/gi)||[]);return'\n__ULIST__\n'+items.map(function(it){return'  - '+it.replace(/<[^>]*>/g,'').trim()}).join('\n')+'\n__ENDULIST__\n'});
t=t.replace(/<(b|strong)>(.*?)<\/\1>/gi,'【B】【/B】');t=t.replace(/<img[^>]*>/gi,' [图片] ');
t=t.replace(/<br\s*\/?>/gi,'\n');t=t.replace(/<\/p>/gi,'\n');t=t.replace(/<p[^>]*>/gi,'');
t=t.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi,'\n\n');
t=t.replace(/<[^>]*>/g,'');t=t.replace(/&nbsp;/gi,' ');t=t.replace(/\r\n/g,'\n');t=t.replace(/\n{4,}/g,'\n\n\n');
return t.trim()}

module.exports={extractFeatures,scoreHypothesis,suggestParseStrategy,enhancedHtmlToText,LAYOUT_PATTERNS,LP_NAMES};