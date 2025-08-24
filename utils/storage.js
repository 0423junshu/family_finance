// utils/storage.js
// 本地存储工具

class Storage {
  // 设置存储
  set(key, value, expire = null) {
    try {
      const data = {
        value,
        timestamp: Date.now(),
        expire: expire ? Date.now() + expire : null
      }
      wx.setStorageSync(key, JSON.stringify(data))
      return true
    } catch (error) {
      console.error('存储设置失败:', error)
      return false
    }
  }

  // 获取存储
  get(key, defaultValue = null) {
    try {
      const dataStr = wx.getStorageSync(key)
      if (!dataStr) return defaultValue
      
      const data = JSON.parse(dataStr)
      
      // 检查是否过期
      if (data.expire && Date.now() > data.expire) {
        this.remove(key)
        return defaultValue
      }
      
      return data.value
    } catch (error) {
      console.error('存储获取失败:', error)
      return defaultValue
    }
  }

  // 移除存储
  remove(key) {
    try {
      wx.removeStorageSync(key)
      return true
    } catch (error) {
      console.error('存储移除失败:', error)
      return false
    }
  }

  // 清空存储
  clear() {
    try {
      wx.clearStorageSync()
      return true
    } catch (error) {
      console.error('存储清空失败:', error)
      return false
    }
  }

  // 获取存储信息
  getInfo() {
    try {
      return wx.getStorageInfoSync()
    } catch (error) {
      console.error('获取存储信息失败:', error)
      return null
    }
  }

  // 批量设置
  setBatch(data, expire = null) {
    const results = {}
    Object.keys(data).forEach(key => {
      results[key] = this.set(key, data[key], expire)
    })
    return results
  }

  // 批量获取
  getBatch(keys, defaultValue = null) {
    const results = {}
    keys.forEach(key => {
      results[key] = this.get(key, defaultValue)
    })
    return results
  }

  // 批量移除
  removeBatch(keys) {
    const results = {}
    keys.forEach(key => {
      results[key] = this.remove(key)
    })
    return results
  }
}

// 创建单例
const storage = new Storage()

module.exports = storage
