// components/common/money-text/money-text.js
const privacy = require('../../../services/privacy');
const { obfuscateNumber, deobfuscateToString } = require('../../../utils/crypto');

Component({
  properties: {
    value: { type: Number, optionalTypes: [String], value: 0 },
    format: { type: String, value: 'currency' }, // currency/number
    compact: { type: Boolean, value: false },
    showToggle: { type: Boolean, value: true },
    // 受控可见性（如需局部不同于全局），默认 null 走全局
    visible: { type: Boolean, optionalTypes: [String, Number], value: null }
  },
  data: {
    internalVisible: false,
    // 仅存储混淆后的 token 与最终展示用字符串，避免明文数值驻留 data
    token: '',
    displayText: '',
    masked: '****'
  },
  lifetimes: {
    attached() {
      // 初始化：生成混淆 token，不在 data 中存原始明文
      const raw = Number(this.data.value || 0);
      const token = obfuscateNumber(raw);
      const initVisible = this.data.visible === null ? privacy.getMoneyVisible() : !!this.data.visible;
      const displayText = initVisible ? this.formatFromToken(token, this.data.format, this.data.compact) : '';
      this.setData({
        token,
        internalVisible: initVisible,
        displayText,
        masked: '****'
      });
      // 订阅全局（仅当未受控时）
      this.unsubscribe = privacy.subscribe((v) => {
        if (this.data.visible === null) {
          const nextText = v ? this.formatFromToken(this.data.token, this.data.format, this.data.compact) : '';
          this.setData({ internalVisible: v, displayText: nextText });
        }
      });
    },
    detached() {
      if (this.unsubscribe) this.unsubscribe();
    }
  },
  observers: {
    'value': function(v) {
      // 更新混淆 token；不在 data 中存放明文
      const raw = Number(v || 0);
      const token = obfuscateNumber(raw);
      const isVisible = this.data.visible === null ? this.data.internalVisible : !!this.data.visible;
      const displayText = isVisible ? this.formatFromToken(token, this.data.format, this.data.compact) : '';
      this.setData({ token, displayText });
    },
    'visible': function(v) {
      if (v !== null) {
        const vv = !!v;
        const displayText = vv ? this.formatFromToken(this.data.token, this.data.format, this.data.compact) : '';
        this.setData({ internalVisible: vv, displayText });
      }
    }
  },
  methods: {
    onToggleChange(e) {
      const v = e && e.detail ? !!e.detail.value : !this.data.internalVisible;
      const displayText = v ? this.formatFromToken(this.data.token, this.data.format, this.data.compact) : '';
      this.setData({ internalVisible: v, displayText });
      this.triggerEvent('visiblechange', { value: v });
    },
    // 本组件内部格式化：仅使用 token 反混淆得到字符串，再交给 wxs/本地格式逻辑
    formatFromToken(token, format, compact) {
      const s = deobfuscateToString(token);
      const n = Number(s || 0);
      // 这里不直接依赖 wxs，遵从 format 约定：'currency' | 'number'
      if (format === 'number') {
        return compact ? ('' + n) : ('' + n);
      }
      // currency：简单格式（保留两位，前缀¥），复杂格式由上层替换或扩展
      const val = (n/1).toFixed(2);
      return `¥${val}`;
    }
  },
  computed: {
    // 小程序不原生支持 computed，这里通过 data + wxml fmt 处理
  }
});