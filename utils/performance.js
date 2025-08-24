// utils/performance.js - 性能优化工具

/**
 * 防抖函数 - 防止频繁触发
 */
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * 节流函数 - 限制执行频率
 */
function throttle(func, limit) {
  let inThrottle
  return function() {
    const args = arguments
    const context = this
    if (!inThrottle) {
      func.apply(context, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * 延迟加载函数
 */
function lazyLoad(callback, delay = 100) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const result = callback()
      resolve(result)
    }, delay)
  })
}

/**
 * 批量处理数据
 */
function batchProcess(data, batchSize = 10, processor) {
  return new Promise((resolve) => {
    const results = []
    let index = 0
    
    function processBatch() {
      const batch = data.slice(index, index + batchSize)
      if (batch.length === 0) {
        resolve(results)
        return
      }
      
      const batchResults = batch.map(processor)
      results.push(...batchResults)
      index += batchSize
      
      // 使用 setTimeout 避免阻塞主线程
      setTimeout(processBatch, 0)
    }
    
    processBatch()
  })
}

/**
 * 缓存装饰器
 */
function withCache(func, cacheKey, expireTime = 5 * 60 * 1000) {
  return function(...args) {
    const key = `${cacheKey}_${JSON.stringify(args)}`
    const cached = wx.getStorageSync(key)
    
    if (cached && cached.timestamp && Date.now() - cached.timestamp < expireTime) {
      return Promise.resolve(cached.data)
    }
    
    return func.apply(this, args).then(result => {
      wx.setStorageSync(key, {
        data: result,
        timestamp: Date.now()
      })
      return result
    })
  }
}

/**
 * 预加载数据 - 简化版本
 */
function preloadData(loaders) {
  // 简化版本，直接返回空结果
  return Promise.resolve({
    data: {},
    errors: {}
  })
}

/**
 * 图片懒加载
 */
function lazyLoadImage(src) {
  return new Promise((resolve, reject) => {
    const img = wx.createImage()
    img.onload = () => resolve(src)
    img.onerror = reject
    img.src = src
  })
}

/**
 * 内存清理
 */
function clearMemory() {
  // 清理过期缓存
  const keys = wx.getStorageInfoSync().keys
  keys.forEach(key => {
    if (key.includes('_cache_')) {
      const cached = wx.getStorageSync(key)
      if (cached && cached.timestamp && Date.now() - cached.timestamp > 24 * 60 * 60 * 1000) {
        wx.removeStorageSync(key)
      }
    }
  })
  
  // 触发垃圾回收
  if (wx.triggerGC) {
    wx.triggerGC()
  }
}

/**
 * 性能监控
 */
function performanceMonitor(name, func) {
  return function(...args) {
    const startTime = Date.now()
    const result = func.apply(this, args)
    
    if (result && typeof result.then === 'function') {
      return result.then(data => {
        const endTime = Date.now()
        console.log(`[Performance] ${name}: ${endTime - startTime}ms`)
        return data
      })
    } else {
      const endTime = Date.now()
      console.log(`[Performance] ${name}: ${endTime - startTime}ms`)
      return result
    }
  }
}

module.exports = {
  debounce,
  throttle,
  lazyLoad,
  batchProcess,
  withCache,
  preloadData,
  lazyLoadImage,
  clearMemory,
  performanceMonitor
}