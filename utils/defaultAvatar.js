/**
 * 默认头像工具
 * 提供默认头像的 base64 数据，避免网络加载问题
 * 注意：微信小程序不支持 btoa 函数，使用 URL 编码替代
 */

/**
 * 微信小程序兼容的 base64 编码函数
 * @param {string} str - 要编码的字符串
 * @returns {string} base64编码结果
 */
function base64Encode(str) {
  // 微信小程序环境使用 wx.arrayBufferToBase64
  if (typeof wx !== 'undefined' && wx.arrayBufferToBase64) {
    const buffer = new ArrayBuffer(str.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < str.length; i++) {
      view[i] = str.charCodeAt(i);
    }
    return wx.arrayBufferToBase64(buffer);
  }
  
  // 备用方案：直接使用 URL 编码的 SVG
  return encodeURIComponent(str);
}

// 简单的默认头像 SVG
const DEFAULT_AVATAR_SVG = `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="20" fill="#E0E0E0"/><circle cx="20" cy="16" r="6" fill="#BDBDBD"/><path d="M8 32c0-6.627 5.373-12 12-12s12 5.373 12 12" fill="#BDBDBD"/></svg>`;

// 使用 data URL 格式，兼容微信小程序
const DEFAULT_AVATAR_BASE64 = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(DEFAULT_AVATAR_SVG)}`;

/**
 * 获取默认头像
 * @param {string} avatarUrl - 原始头像URL
 * @returns {string} 头像URL或默认头像
 */
function getAvatarUrl(avatarUrl) {
  if (!avatarUrl || avatarUrl === '/images/default-avatar.png' || avatarUrl === '/images/default-avatar.svg') {
    return DEFAULT_AVATAR_BASE64;
  }
  return avatarUrl;
}

/**
 * 生成用户名首字母头像
 * @param {string} name - 用户名
 * @param {string} bgColor - 背景颜色
 * @returns {string} data URL头像
 */
function generateInitialAvatar(name, bgColor = '#4CAF50') {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const svg = `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="20" fill="${bgColor}"/><text x="20" y="26" text-anchor="middle" fill="white" font-size="16" font-family="Arial">${initial}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

module.exports = {
  DEFAULT_AVATAR_BASE64,
  getAvatarUrl,
  generateInitialAvatar
};