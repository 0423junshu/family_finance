#!/usr/bin/env node
/**
 * WXML 红线扫描脚本（最小可用）
 * 检测：模板中的函数调用、嵌套三元(>1层)、数组/对象字面量构造等复杂表达式
 * 退出码：命中红线时返回 2
 */
const fs = require('fs');
const path = require('path');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function tryDirs(dirs) {
  const files = [];
  for (const d of dirs) {
    if (fs.existsSync(d)) files.push(...walk(d));
  }
  return files;
}

// 目标：pages 与 components 下的 .wxml
const targets = tryDirs(['pages', 'components']).filter((f) => f.endsWith('.wxml'));

const hits = [];
const rules = [
  { id: 'func-call', re: /\{\{[^}]*\w+\([^}]*\)[^}]*\}\}/, msg: '模板中存在函数调用' },
  { id: 'nested-ternary', re: /\?.*?\?/, msg: '嵌套三元表达式 (> 1 层)' },
  { id: 'object-lit', re: /\{\{[^}]*\{[^}]*:[^}]*\}[^}]*\}\}/, msg: '对象字面量构造' },
  { id: 'array-lit', re: /\{\{[^}]*\[[^\]]*\][^}]*\}\}/, msg: '数组字面量构造' }
];

for (const file of targets) {
  const content = fs.readFileSync(file, 'utf8');
  const localHits = [];
  for (const rule of rules) {
    if (rule.re.test(content)) {
      localHits.push(rule.id + ':' + rule.msg);
    }
  }
  if (localHits.length) hits.push({ file, rules: localHits });
}

if (hits.length) {
  console.error('[WXML Scan] 复杂表达式红线命中：');
  for (const h of hits) {
    console.error('- ' + h.file);
    for (const r of h.rules) console.error('   * ' + r);
  }
  process.exit(2);
} else {
  console.log('[WXML Scan] OK');
}