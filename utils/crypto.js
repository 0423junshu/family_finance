// utils/crypto.js
// 轻量混淆：降低控制台直观可见性，非强对抗加密
// 策略：运行期盐 + 简单 XOR + Base64，盐不落盘，仅内存
function getRuntimeSalt() {
  // 使用时间片 + 随机数组拼接；不落盘
  const rand = Math.floor(Math.random() * 1e9);
  const t = Date.now() & 0xfffffff;
  return ((rand ^ t) >>> 0);
}
const RUNTIME_SALT = getRuntimeSalt();

function toBytes(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i) & 0xff);
  }
  return bytes;
}
function fromBytes(bytes) {
  return String.fromCharCode.apply(null, bytes);
}
function b64encode(str) {
  // 小程序支持 btoa/atob 吗？不保证；用 wx.arrayBufferToBase64
  const bytes = new Uint8Array(toBytes(str)).buffer;
  return wx.arrayBufferToBase64(bytes);
}
function b64decode(b64) {
  const buf = wx.base64ToArrayBuffer(b64);
  const arr = new Uint8Array(buf);
  const bytes = Array.from(arr);
  return fromBytes(bytes);
}

function xorStr(str, key) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    const k = (key >>> (8 * (i % 4))) & 0xff;
    out.push(String.fromCharCode((str.charCodeAt(i) ^ k) & 0xff));
  }
  return out.join('');
}

function obfuscateNumber(n) {
  // 保留原始数值传入，不在 data 中保存明文，仅在渲染中使用
  const s = String(n);
  const x = xorStr(s, RUNTIME_SALT);
  return b64encode(x);
}

function deobfuscateToString(token) {
  try {
    const x = b64decode(token);
    const s = xorStr(x, RUNTIME_SALT);
    return s;
  } catch (e) {
    return '';
  }
}

module.exports = {
  obfuscateNumber,
  deobfuscateToString
};