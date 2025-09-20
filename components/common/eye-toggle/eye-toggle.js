// components/common/eye-toggle/eye-toggle.js
const privacy = require('../../../services/privacy');

Component({
  properties: {
    // 外部可覆盖的可见性（受控模式），默认使用全局
    visible: { type: Boolean, optionalTypes: [String, Number], value: null },
    // 图标资源，可按需替换
    iconVisible: { type: String, value: '/images/icons/eye-on.png' },
    iconHidden: { type: String, value: '/images/icons/eye-off.png' }
  },
  data: {
    internalVisible: false
  },
  lifetimes: {
    attached() {
      this.unsubscribe = privacy.subscribe((v) => {
        // 非受控模式下，跟随全局
        if (this.data.visible === null) {
          this.setData({ internalVisible: v });
        }
      });
      if (this.data.visible === null) {
        this.setData({ internalVisible: privacy.getMoneyVisible() });
      } else {
        this.setData({ internalVisible: !!this.data.visible });
      }
    },
    detached() {
      if (this.unsubscribe) this.unsubscribe();
    }
  },
  observers: {
    'visible': function(v) {
      if (v !== null) {
        this.setData({ internalVisible: !!v });
      }
    }
  },
  methods: {
    onTap() {
      // 默认切换全局；若受控则仅派发事件
      if (this.data.visible === null) {
        privacy.toggleMoneyVisible();
        this.triggerEvent('change', { value: privacy.getMoneyVisible() });
      } else {
        const next = !this.data.internalVisible;
        this.setData({ internalVisible: next });
        this.triggerEvent('change', { value: next });
      }
    }
  }
});