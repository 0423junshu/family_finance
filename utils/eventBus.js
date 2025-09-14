/**
 * 简单的事件总线实现
 * 用于页面间通信
 */

class EventBus {
  constructor() {
    this.events = {};
  }

  // 监听事件
  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);
  }

  // 触发事件
  emit(eventName, data) {
    if (this.events[eventName]) {
      this.events[eventName].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件回调执行失败 [${eventName}]:`, error);
        }
      });
    }
  }

  // 移除事件监听
  off(eventName, callback) {
    if (this.events[eventName]) {
      if (callback) {
        this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
      } else {
        delete this.events[eventName];
      }
    }
  }

  // 只监听一次
  once(eventName, callback) {
    const onceCallback = (data) => {
      callback(data);
      this.off(eventName, onceCallback);
    };
    this.on(eventName, onceCallback);
  }
}

// 创建全局事件总线实例
const eventBus = new EventBus();

// 挂载到wx对象上，方便全局使用
if (typeof wx !== 'undefined') {
  wx.$emit = eventBus.emit.bind(eventBus);
  wx.$on = eventBus.on.bind(eventBus);
  wx.$off = eventBus.off.bind(eventBus);
  wx.$once = eventBus.once.bind(eventBus);
}

module.exports = eventBus;