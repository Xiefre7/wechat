/**
 * 导题斩题小工具 - DOCX 数学公式提取器
 *
 * .docx 本质是 ZIP 包，word/document.xml 内存储文档正文。
 * Word 公式编辑器生成的公式以 OMML（Office MathML）格式存储在 <m:oMath> 元素中。
 * mammoth.extractRawText() 完全丢弃 OMML 内容，导致数学公式丢失。
 *
 * 本模块直接解压 .docx → 解析 document.xml → 按文档顺序提取
 * 普通文本（<w:t>）和数学公式（<m:oMath>），将 OMML 转换为可读文本。
 *
 * OMML → 文本转换策略：
 *   - 分数 m:f → 分子/分母
 *   - 上标 m:sSup → 基底^指数
 *   - 下标 m:sSub → 基底_下标
 *   - 根号 m:rad → √(被开方数)
 *   - N元运算 m:nary → ∑/∫/∏ 上下限
 *   - 定界符 m:d → (内容) / [内容] / {内容}
 *   - 重音 m:acc → x̄ / x̂ / x⃗
 *   - 矩阵 m:m → 逐行输出
 *   - 希腊字母 → Unicode 映射
 *   - 特殊符号 → Unicode 映射
 *
 * 对复杂嵌套结构（如分式内含根号），采用递归处理 + 圆括号消歧义。
 */

'use strict';

// ==================== OMML 符号映射表 ====================

/** OMML 数学字符 → Unicode 映射 */
var OMML_CHAR_MAP = {
  // 希腊字母
  'alpha': '\u03B1', 'beta': '\u03B2', 'gamma': '\u03B3', 'delta': '\u03B4',
  'epsilon': '\u03B5', 'varepsilon': '\u03F5', 'zeta': '\u03B6', 'eta': '\u03B7',
  'theta': '\u03B8', 'vartheta': '\u03D1', 'iota': '\u03B9', 'kappa': '\u03BA',
  'lambda': '\u03BB', 'mu': '\u03BC', 'nu': '\u03BD', 'xi': '\u03BE',
  'omicron': '\u03BF', 'pi': '\u03C0', 'varpi': '\u03D6', 'rho': '\u03C1',
  'varrho': '\u03F1', 'sigma': '\u03C3', 'varsigma': '\u03C2', 'tau': '\u03C4',
  'upsilon': '\u03C5', 'phi': '\u03C6', 'varphi': '\u03D5', 'chi': '\u03C7',
  'psi': '\u03C8', 'omega': '\u03C9',
  'Alpha': '\u0391', 'Beta': '\u0392', 'Gamma': '\u0393', 'Delta': '\u0394',
  'Epsilon': '\u0395', 'Zeta': '\u0396', 'Eta': '\u0397', 'Theta': '\u0398',
  'Iota': '\u0399', 'Kappa': '\u039A', 'Lambda': '\u039B', 'Mu': '\u039C',
  'Nu': '\u039D', 'Xi': '\u039E', 'Omicron': '\u039F', 'Pi': '\u03A0',
  'Rho': '\u03A1', 'Sigma': '\u03A3', 'Tau': '\u03A4', 'Upsilon': '\u03A5',
  'Phi': '\u03A6', 'Chi': '\u03A7', 'Psi': '\u03A8', 'Omega': '\u03A9',
  // 运算符
  'leq': '\u2264', 'geq': '\u2265', 'neq': '\u2260', 'approx': '\u2248',
  'equiv': '\u2261', 'sim': '\u223C', 'simeq': '\u2243', 'cong': '\u2245',
  'propto': '\u221D', 'infty': '\u221E', 'partial': '\u2202', 'nabla': '\u2207',
  'forall': '\u2200', 'exists': '\u2203', 'notin': '\u2209', 'in': '\u2208',
  'ni': '\u220B', 'subset': '\u2282', 'supset': '\u2283',
  'cup': '\u222A', 'cap': '\u2229', 'emptyset': '\u2205',
  'cdot': '\u00B7', 'cdots': '\u22EF', 'ldots': '\u2026', 'vdots': '\u22EE', 'ddots': '\u22F1',
  'pm': '\u00B1', 'mp': '\u2213', 'times': '\u00D7', 'div': '\u00F7',
  'ast': '\u2217', 'star': '\u22C6', 'circ': '\u2218', 'bullet': '\u2022',
  'oplus': '\u2295', 'ominus': '\u2296', 'otimes': '\u2297',
  'land': '\u2227', 'lor': '\u2228', 'lnot': '\u00AC',
  'rightarrow': '\u2192', 'leftarrow': '\u2190', 'Rightarrow': '\u21D2', 'Leftarrow': '\u21D0',
  'leftrightarrow': '\u2194', 'Leftrightarrow': '\u21D4',
  'mapsto': '\u21A6', 'to': '\u2192',
  'uparrow': '\u2191', 'downarrow': '\u2193',
  'angle': '\u2220', 'perp': '\u22A5', 'parallel': '\u2225',
  'prime': '\u2032', 'dprime': '\u2033',
  'hbar': '\u210F', 'ell': '\u2113', 'Re': '\u211C', 'Im': '\u2111',
  'aleph': '\u2135', 'deg': '\u00B0',
  'ln': 'ln', 'log': 'log', 'lim': 'lim', 'max': 'max', 'min': 'min',
  'sin': 'sin', 'cos': 'cos', 'tan': 'tan', 'cot': 'cot',
  'sec': 'sec', 'csc': 'csc', 'arcsin': 'arcsin', 'arccos': 'arccos',
  'arctan': 'arctan', 'sinh': 'sinh', 'cosh': 'cosh', 'tanh': 'tanh',
  'det': 'det', 'dim': 'dim', 'exp': 'exp', 'gcd': 'gcd', 'sup': 'sup', 'inf': 'inf',
};

/** OMML N元运算符 chr 属性 → Unicode */
var NARY_CHAR_MAP = {
  '\u222B': '\u222B',  // ∫ 积分
  '\u222C': '\u222C',  // ∬ 二重积分
  '\u222D': '\u222D',  // ∭ 三重积分
  '\u222E': '\u222E',  // ∮ 环路积分
  '\u2211': '\u2211',  // ∑ 求和
  '\u220F': '\u220F',  // ∏ 求积
  '\u22C0': '\u22C0',  // ⋀ 逻辑与
  '\u22C1': '\u22C1',  // ⋁ 逻辑或
  '\u22C2': '\u22C2',  // ⋂ 交集
  '\u22C3': '\u22C3',  // ⋃ 并集
  '\u2295': '\u2295',  // ⊕
  '\u2297': '\u2297',  // ⊗
  '\u2210': '\u2210',  // ∐ 余积
};

/** OMML 重音 acc 字符 → 标记 */
var ACCENT_MAP = {
  '\u0302': '^',   // hat
  '\u0303': '~',   // tilde
  '\u0304': '\u0304',  // bar (组合用)
  '\u0307': '\u0307',  // dot
  '\u0308': '\u0308',  // ddot
  '\u20D7': '\u20D7',  // vec (箭头)
  '\u0306': '\u0306',  // breve
  '\u030C': '\u030C',  // check
  '\u030A': '\u030A',  // ring
  '\u0301': '\u0301',  // acute
  '\u0300': '\u0300',  // grave
};

// ==================== XML 工具函数 ====================

/**
 * 极简 XML 标签匹配正则
 * 不依赖 DOM 解析库，用正则按文档顺序提取元素
 */

/** 提取指定标签的所有内容（含嵌套），返回 {start, end, content, full} 数组 */
function findElements(xml, tagName) {
  var results = [];
  var openTag = '<' + tagName;
  var closeTag = '</' + tagName + '>';
  var pos = 0;

  while (pos < xml.length) {
    var start = xml.indexOf(openTag, pos);
    if (start === -1) break;

    // 确认是完整标签开头（后面跟 > 或空格）
    var afterTag = xml.charAt(start + openTag.length);
    if (afterTag !== '>' && afterTag !== ' ' && afterTag !== '/') {
      pos = start + openTag.length;
      continue;
    }

    // 找到自闭合或匹配的关闭标签
    var tagEnd = xml.indexOf('>', start);
    if (tagEnd === -1) break;

    // 检查是否自闭合
    if (xml.charAt(tagEnd - 1) === '/') {
      results.push({
        start: start,
        end: tagEnd + 1,
        content: '',
        full: xml.substring(start, tagEnd + 1),
      });
      pos = tagEnd + 1;
      continue;
    }

    // 查找匹配的关闭标签（处理嵌套）
    var depth = 1;
    var searchPos = tagEnd + 1;
    while (depth > 0 && searchPos < xml.length) {
      var nextOpen = xml.indexOf(openTag, searchPos);
      var nextClose = xml.indexOf(closeTag, searchPos);

      if (nextClose === -1) break;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        // 确认是完整标签
        var charAfter = xml.charAt(nextOpen + openTag.length);
        if (charAfter === '>' || charAfter === ' ' || charAfter === '/') {
          // 检查是否自闭合
          var innerTagEnd = xml.indexOf('>', nextOpen);
          if (innerTagEnd !== -1 && xml.charAt(innerTagEnd - 1) === '/') {
            // 自闭合，不增加深度
          } else {
            depth++;
          }
          searchPos = nextOpen + openTag.length;
        } else {
          searchPos = nextOpen + 1;
        }
      } else {
        depth--;
        if (depth === 0) {
          results.push({
            start: start,
            end: nextClose + closeTag.length,
            content: xml.substring(tagEnd + 1, nextClose),
            full: xml.substring(start, nextClose + closeTag.length),
          });
          pos = nextClose + closeTag.length;
          break;
        }
        searchPos = nextClose + closeTag.length;
      }
    }

    if (depth > 0) break;  // 未找到匹配关闭标签
  }

  return results;
}

/** 提取标签属性值 */
function getAttr(element, attrName) {
  var match = element.match(new RegExp(attrName + '\\s*=\\s*"([^"]*)"', 'i'));
  return match ? match[1] : '';
}

/** 提取 <m:t> 或 <w:t> 标签内的文本 */
function extractTextContent(xml) {
  var text = '';
  var regex = /<(?:m:t|w:t)[^>]*>([\s\S]*?)<\/(?:m:t|w:t)>/g;
  var match;
  while ((match = regex.exec(xml)) !== null) {
    text += match[1];
  }
  // XML 实体解码
  text = text.replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
  return text;
}

/** 提取 <w:t> 标签内的文本（仅普通文本，不含数学） */
function extractWText(xml) {
  var text = '';
  var regex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  var match;
  while ((match = regex.exec(xml)) !== null) {
    text += match[1];
  }
  text = text.replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
  return text;
}

/** 提取 <w:tab/> 为制表符 */
function extractWTab(xml) {
  var count = (xml.match(/<w:tab\s*\/>/g) || []).length;
  return count > 0 ? '\t'.repeat(count) : '';
}

// ==================== OMML → 文本转换核心 ====================

/**
 * 递归解析 OMML 内容，返回可读文本
 * @param {string} xml - OMML 元素的内部 XML
 * @returns {string}
 */
function parseOMMLContent(xml) {
  if (!xml || !xml.trim()) return '';
  var result = '';
  var pos = 0;

  while (pos < xml.length) {
    // 查找下一个 m: 或 w: 开头的标签
    var tagMatch = xml.substring(pos).match(/<(m:|w:)(\w+)/);
    if (!tagMatch) {
      // 没有更多标签，剩余是文本
      result += xml.substring(pos).replace(/<[^>]+>/g, '');
      break;
    }

    var tagStart = pos + tagMatch.index;
    // 添加标签前的纯文本
    if (tagStart > pos) {
      result += xml.substring(pos, tagStart).replace(/<[^>]+>/g, '');
    }

    var prefix = tagMatch[1];  // 'm:' or 'w:'
    var tagName = tagMatch[2]; // 标签名
    var fullTag = prefix + tagName;

    // 找到标签结束位置
    var tagEnd = xml.indexOf('>', tagStart);
    if (tagEnd === -1) break;

    var isSelfClosing = xml.charAt(tagEnd - 1) === '/';

    if (isSelfClosing) {
      // 自闭合标签
      if (fullTag === 'w:tab') {
        result += '\t';
      } else if (fullTag === 'w:br') {
        result += '\n';
      }
      pos = tagEnd + 1;
      continue;
    }

    // 查找匹配的关闭标签
    var closeTag = '</' + fullTag + '>';
    var depth = 1;
    var searchPos = tagEnd + 1;
    var contentEnd = -1;

    while (depth > 0 && searchPos < xml.length) {
      var nextOpen = xml.indexOf('<' + fullTag, searchPos);
      var nextClose = xml.indexOf(closeTag, searchPos);

      if (nextClose === -1) break;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        var charAfter = xml.charAt(nextOpen + fullTag.length + 1);
        if (charAfter === '>' || charAfter === ' ' || charAfter === '/') {
          var innerEnd = xml.indexOf('>', nextOpen);
          if (innerEnd !== -1 && xml.charAt(innerEnd - 1) === '/') {
            // 自闭合
          } else {
            depth++;
          }
          searchPos = nextOpen + 1;
        } else {
          searchPos = nextOpen + 1;
        }
      } else {
        depth--;
        if (depth === 0) {
          contentEnd = nextClose;
        }
        searchPos = nextClose + closeTag.length;
      }
    }

    if (contentEnd === -1) {
      pos = tagEnd + 1;
      continue;
    }

    var innerContent = xml.substring(tagEnd + 1, contentEnd);

    // 根据标签类型处理
    result += processOMMLElement(fullTag, innerContent, xml.substring(tagStart, contentEnd + closeTag.length));

    pos = contentEnd + closeTag.length;
  }

  return result;
}

/**
 * 处理单个 OMML 元素
 */
function processOMMLElement(tagName, innerContent, fullElement) {
  switch (tagName) {
    case 'm:r':
      // math run — 提取 m:t 文本
      return extractTextContent(innerContent);

    case 'm:t':
      return extractTextContent(innerContent);

    case 'w:r':
      // 普通文本 run
      var text = extractWText(innerContent);
      var tabs = extractWTab(innerContent);
      return text + tabs;

    case 'w:t':
      return extractWText(innerContent);

    case 'm:sSup': {
      // 上标：基底^指数
      var base = getMathChild(innerContent, 'e');
      var sup = getMathChild(innerContent, 'sup');
      return formatSuperscript(base, sup);
    }

    case 'm:sSub': {
      // 下标：基底_下标
      var base2 = getMathChild(innerContent, 'e');
      var sub = getMathChild(innerContent, 'sub');
      return formatSubscript(base2, sub);
    }

    case 'm:sSubSup': {
      // 上下标
      var base3 = getMathChild(innerContent, 'e');
      var sub2 = getMathChild(innerContent, 'sub');
      var sup2 = getMathChild(innerContent, 'sup');
      return formatSubscript(base3, sub2) + formatSuperscript('', sup2);
    }

    case 'm:f': {
      // 分数
      var num = getMathChild(innerContent, 'num');
      var den = getMathChild(innerContent, 'den');
      return formatFraction(num, den);
    }

    case 'm:rad': {
      // 根号
      var deg = getMathChild(innerContent, 'deg');
      var radE = getMathChild(innerContent, 'e');
      return formatRadical(radE, deg);
    }

    case 'm:nary': {
      // N元运算（∑ ∫ ∏ 等）
      return formatNary(fullElement, innerContent);
    }

    case 'm:d': {
      // 定界符 (括号)
      var begChr = getAttr(fullElement, 'm:begChr') || getAttr(fullElement, 'begChr') || '(';
      var endChr = getAttr(fullElement, 'm:endChr') || getAttr(fullElement, 'endChr') || ')';
      var delimE = getMathChild(innerContent, 'e');
      return formatDelimiter(delimE, begChr, endChr);
    }

    case 'm:acc': {
      // 重音（上划线、帽子等）
      var accChr = getAttr(fullElement, 'm:accChr') || getAttr(fullElement, 'accChr') || '\u0304';
      var accE = getMathChild(innerContent, 'e');
      return formatAccent(accE, accChr);
    }

    case 'm:bar': {
      // 上划线/下划线
      var barPos = getAttr(fullElement, 'm:pos') || getAttr(fullElement, 'pos') || 'top';
      var barE = getMathChild(innerContent, 'e');
      return formatBar(barE, barPos);
    }

    case 'm:limLow': {
      // 下极限
      var limE = getMathChild(innerContent, 'e');
      var lim = getMathChild(innerContent, 'lim');
      return limE + '_' + wrapIfNeeded(lim);
    }

    case 'm:limUpp': {
      // 上极限
      var limE2 = getMathChild(innerContent, 'e');
      var lim2 = getMathChild(innerContent, 'lim');
      return formatSuperscript(limE2, lim2);
    }

    case 'm:groupChr': {
      // 组字符（underbrace 等）
      return getMathChild(innerContent, 'e');
    }

    case 'm:eqArr': {
      // 方程组 — 每行用换行分隔
      var rows = findElements(innerContent, 'm:e');
      return rows.map(function (r) {
        return parseOMMLContent(r.content);
      }).join('\n');
    }

    case 'm:m': {
      // 矩阵
      return formatMatrix(innerContent);
    }

    case 'm:func': {
      // 函数
      var fname = getMathChild(innerContent, 'fName');
      var fArg = getMathChild(innerContent, 'e');
      return fname + '(' + fArg + ')';
    }

    case 'm:box':
      // 逻辑框
      return parseOMMLContent(innerContent);

    case 'm:border':
      return parseOMMLContent(innerContent);

    case 'm:argPr':
    case 'm:ctrlPr':
    case 'm:rPr':
    case 'w:rPr':
    case 'm:mathPr':
      // 属性元素，跳过
      return '';

    default:
      // 未知元素，递归处理内容
      if (innerContent && innerContent.trim()) {
        return parseOMMLContent(innerContent);
      }
      return '';
  }
}

/**
 * 获取 m: 元素下指定子元素的内容
 */
function getMathChild(parentXml, childTag) {
  var fullTag = 'm:' + childTag;
  var elements = findElements(parentXml, fullTag);
  if (elements.length === 0) return '';
  return parseOMMLContent(elements[0].content);
}

// ==================== 格式化函数 ====================

/** 判断是否需要加括号 */
function needsWrap(text) {
  if (!text) return false;
  var trimmed = text.trim();
  if (trimmed.length <= 1) return false;
  // 含空格、运算符、斜杠的多字符内容需要括号
  return /[\s+\-*/=,]/.test(trimmed) && !/^\(.*\)$/.test(trimmed);
}

function wrapIfNeeded(text) {
  if (!text) return '';
  return needsWrap(text) ? '(' + text + ')' : text;
}

/** 上标：优先用 Unicode 上标，否则用 ^ */
function formatSuperscript(base, sup) {
  if (!sup) return base || '';
  var supMap = {
    '0': '\u2070', '1': '\u00B9', '2': '\u00B2', '3': '\u00B3',
    '4': '\u2074', '5': '\u2075', '6': '\u2076', '7': '\u2077',
    '8': '\u2078', '9': '\u2079', '+': '\u207A', '-': '\u207B',
    '=': '\u207C', '(': '\u207D', ')': '\u207E', 'n': '\u207F',
  };

  // 尝试全部转为 Unicode 上标
  var allConvertible = true;
  var unicodeSup = '';
  for (var i = 0; i < sup.length; i++) {
    var ch = sup[i];
    if (supMap[ch]) {
      unicodeSup += supMap[ch];
    } else {
      allConvertible = false;
      break;
    }
  }

  if (allConvertible) {
    return (base || '') + unicodeSup;
  }

  // 多字符上标用 ^ 表示
  return (base || '') + '^' + wrapIfNeeded(sup);
}

/** 下标：优先用 Unicode 下标，否则用 _ */
function formatSubscript(base, sub) {
  if (!sub) return base || '';
  var subMap = {
    '0': '\u2080', '1': '\u2081', '2': '\u2082', '3': '\u2083',
    '4': '\u2084', '5': '\u2085', '6': '\u2086', '7': '\u2087',
    '8': '\u2088', '9': '\u2089', '+': '\u208A', '-': '\u208B',
    '=': '\u208C', '(': '\u208D', ')': '\u208E',
    'a': '\u2090', 'e': '\u2091', 'o': '\u2092', 'x': '\u2093',
  };

  var allConvertible = true;
  var unicodeSub = '';
  for (var i = 0; i < sub.length; i++) {
    var ch = sub[i];
    if (subMap[ch]) {
      unicodeSub += subMap[ch];
    } else {
      allConvertible = false;
      break;
    }
  }

  if (allConvertible) {
    return (base || '') + unicodeSub;
  }

  return (base || '') + '_' + wrapIfNeeded(sub);
}

/** 分数：num/den，复杂内容加括号 */
function formatFraction(num, den) {
  if (!num) num = '';
  if (!den) den = '';
  return wrapIfNeeded(num) + '/' + wrapIfNeeded(den);
}

/** 根号 */
function formatRadical(content, degree) {
  if (!content) return '';
  if (degree && degree.trim() && degree.trim() !== '2') {
    // 非平方根
    return degree + '\u221A(' + content + ')';
  }
  // 检查内容是否简单
  if (!needsWrap(content)) {
    return '\u221A' + content;
  }
  return '\u221A(' + content + ')';
}

/** N元运算符 */
function formatNary(fullElement, innerContent) {
  // 从 m:naryPr/m:chr 获取运算符字符
  var chrMatch = fullElement.match(/<m:chr\s+m:val\s*=\s*"([^"]*)"/);
  var chr = chrMatch ? chrMatch[1] : '\u2211';

  var op = NARY_CHAR_MAP[chr] || chr || '\u2211';

  var sub = getMathChild(innerContent, 'sub');
  var sup = getMathChild(innerContent, 'sup');
  var e = getMathChild(innerContent, 'e');

  var result = op;
  if (sub) result += '_' + wrapIfNeeded(sub);
  if (sup) result += '^' + wrapIfNeeded(sup);
  if (e) result += ' ' + e;

  return result;
}

/** 定界符 */
function formatDelimiter(content, begChr, endChr) {
  if (!begChr || begChr === 'none') begChr = '(';
  if (!endChr || endChr === 'none') endChr = ')';
  return begChr + (content || '') + endChr;
}

/** 重音 */
function formatAccent(content, accChr) {
  if (!content) return '';
  var marker = ACCENT_MAP[accChr] || '';
  if (accChr === '\u0304') {
    // 上划线 — 用组合字符
    if (content.length === 1) {
      return content + '\u0304';
    }
    return content + '\u0304';
  }
  if (accChr === '\u0302') {
    // 帽子
    return content + '\u0302';
  }
  if (accChr === '\u0303') {
    // 波浪号
    return content + '\u0303';
  }
  if (accChr === '\u20D7') {
    // 向量箭头
    if (content.length === 1) return content + '\u20D7';
    return '\u2192' + content;
  }
  if (accChr === '\u0307') {
    // 点（导数）
    return content + '\u0307';
  }
  return content + (marker || '');
}

/** 上划线/下划线 */
function formatBar(content, pos) {
  if (!content) return '';
  if (pos === 'bot') {
    return content + '\u0332';  // 下划线组合字符
  }
  return content + '\u0304';  // 上划线组合字符
}

/** 矩阵 */
function formatMatrix(innerContent) {
  var rows = findElements(innerContent, 'm:mr');
  if (rows.length === 0) return '';
  var formatted = rows.map(function (row) {
    var cells = findElements(row.content, 'm:e');
    var cellTexts = cells.map(function (c) {
      return parseOMMLContent(c.content);
    });
    return cellTexts.join(', ');
  });
  return '[' + formatted.join('; ') + ']';
}

// ==================== 文档级解析 ====================

/**
 * 解析 document.xml，提取完整文本（含数学公式）
 * 按文档顺序遍历段落，每个段落内合并普通文本和数学公式
 *
 * @param {string} documentXml - word/document.xml 的内容
 * @returns {string} 提取的文本（段落间用 \n 分隔）
 */
function parseDocumentXml(documentXml) {
  if (!documentXml) return '';

  var paragraphs = findElements(documentXml, 'w:p');
  if (paragraphs.length === 0) return '';

  var lines = [];
  for (var i = 0; i < paragraphs.length; i++) {
    var paraContent = paragraphs[i].content;
    var lineText = extractParagraphText(paraContent);
    if (lineText.trim()) {
      lines.push(lineText);
    } else {
      lines.push('');  // 保留空行作为段落分隔
    }
  }

  return lines.join('\n');
}

/**
 * 提取单个段落内的文本（普通文本 + 数学公式）
 */
function extractParagraphText(paraXml) {
  if (!paraXml) return '';
  var result = '';
  var pos = 0;

  while (pos < paraXml.length) {
    // 查找下一个标签
    var tagMatch = paraXml.substring(pos).match(/<(m:|w:)(\w+)/);
    if (!tagMatch) {
      break;
    }

    var tagStart = pos + tagMatch.index;
    var prefix = tagMatch[1];
    var tagName = tagMatch[2];
    var fullTag = prefix + tagName;

    var tagEnd = paraXml.indexOf('>', tagStart);
    if (tagEnd === -1) break;

    var isSelfClosing = paraXml.charAt(tagEnd - 1) === '/';

    if (isSelfClosing) {
      if (fullTag === 'w:tab') result += '\t';
      else if (fullTag === 'w:br' || fullTag === 'w:cr') result += '\n';
      pos = tagEnd + 1;
      continue;
    }

    // 查找匹配的关闭标签
    var closeTag = '</' + fullTag + '>';
    var depth = 1;
    var searchPos = tagEnd + 1;
    var contentEnd = -1;

    while (depth > 0 && searchPos < paraXml.length) {
      var nextOpen = paraXml.indexOf('<' + fullTag, searchPos);
      var nextClose = paraXml.indexOf(closeTag, searchPos);

      if (nextClose === -1) break;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        var charAfter = paraXml.charAt(nextOpen + fullTag.length + 1);
        if (charAfter === '>' || charAfter === ' ' || charAfter === '/') {
          var innerEnd = paraXml.indexOf('>', nextOpen);
          if (innerEnd !== -1 && paraXml.charAt(innerEnd - 1) === '/') {
            // 自闭合
          } else {
            depth++;
          }
          searchPos = nextOpen + 1;
        } else {
          searchPos = nextOpen + 1;
        }
      } else {
        depth--;
        if (depth === 0) {
          contentEnd = nextClose;
        }
        searchPos = nextClose + closeTag.length;
      }
    }

    if (contentEnd === -1) {
      pos = tagEnd + 1;
      continue;
    }

    var innerContent = paraXml.substring(tagEnd + 1, contentEnd);

    // 处理关键标签
    if (fullTag === 'm:oMath' || fullTag === 'm:oMathPara') {
      // 数学公式块
      var mathText = parseOMMLContent(innerContent);
      result += mathText;
    } else if (fullTag === 'w:r') {
      // 普通文本 run
      result += extractWText(innerContent);
      result += extractWTab(innerContent);
    } else if (fullTag === 'm:r') {
      // 数学 run
      result += extractTextContent(innerContent);
    } else {
      // 其他标签，递归处理（可能嵌套 w:r 或 m:oMath）
      result += extractParagraphText(innerContent);
    }

    pos = contentEnd + closeTag.length;
  }

  return result;
}

// ==================== 数学符号后处理 ====================

/**
 * 对提取的文本进行数学符号后处理
 * 修正常见的不完整转换，增强可读性
 */
function postProcessMath(text) {
  if (!text) return text;

  // OMML 字符名 → Unicode（处理残留的字符引用）
  text = text.replace(/&(\w+);/g, function (match, name) {
    return OMML_CHAR_MAP[name] || match;
  });

  // 合并多余空格（但保留公式内的单空格）
  text = text.replace(/[ \t]{2,}/g, ' ');

  // 修正上标后跟运算符的情况：x²+1 → x² + 1
  text = text.replace(/([\u2070-\u2079\u00B2\u00B3\u207A-\u207F])([+\-=])/g, '$1 $2');

  // 修正下标后跟运算符的情况
  text = text.replace(/([\u2080-\u2089\u208A-\u208E])([+\-=])/g, '$1 $2');

  return text;
}

// ==================== 主入口 ====================

/**
 * 从 .docx 文件 Buffer 提取文本（含数学公式）
 *
 * @param {Buffer} fileBuffer - .docx 文件内容
 * @returns {{text: string, mathFound: boolean, method: string}}
 */
function extractFromDocx(fileBuffer) {
  var AdmZip;
  try {
    AdmZip = require('adm-zip');
  } catch (e) {
    throw new Error('adm-zip 模块未安装: ' + e.message);
  }

  var zip = new AdmZip(fileBuffer);
  var documentEntry = zip.getEntry('word/document.xml');
  if (!documentEntry) {
    throw new Error('docx 文件中未找到 word/document.xml');
  }

  var documentXml = documentEntry.getData().toString('utf-8');

  // 检查文档是否包含 OMML 数学公式
  var hasOMML = documentXml.indexOf('<m:oMath') !== -1;

  // 解析文档
  var text = parseDocumentXml(documentXml);

  // 后处理
  text = postProcessMath(text);

  return {
    text: text,
    mathFound: hasOMML,
    method: hasOMML ? 'omml' : 'xml',
  };
}

module.exports = {
  extractFromDocx: extractFromDocx,
  parseDocumentXml: parseDocumentXml,
  parseOMMLContent: parseOMMLContent,
  postProcessMath: postProcessMath,
  // 暴露工具函数供测试
  formatSuperscript: formatSuperscript,
  formatSubscript: formatSubscript,
  formatFraction: formatFraction,
  formatRadical: formatRadical,
  OMML_CHAR_MAP: OMML_CHAR_MAP,
};
