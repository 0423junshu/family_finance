// utils/request.js
// 云函数请求封装

class CloudRequest {
  constructor() {
    this.baseConfig = {
      timeout: 10000,
      retryCount: 3
    }
  }

  // 调用云函数 - 简化版本，直接抛出错误让业务层使用本地存储
  async callFunction(name, data = {}, options = {}) {
    console.log(`云函数 ${name} 调用跳过，使用本地存储模式`)
    
    // 直接抛出错误，让业务层使用本地存储
    throw {
      code: 'CLOUD_NOT_AVAILABLE',
      message: '使用本地存储模式'
    }
  }

  // 批量调用云函数
  async batchCall(requests) {
    const promises = requests.map(({ name, data, options }) => 
      this.callFunction(name, data, options)
    )
    
    try {
      return await Promise.all(promises)
    } catch (error) {
      console.error('批量调用失败:', error)
      throw error
    }
  }

  // 错误处理
  handleError(error, functionName) {
    const errorMap = {
      'PERMISSION_DENIED': '权限不足',
      'NETWORK_ERROR': '网络连接失败',
      'TIMEOUT': '请求超时',
      'FUNCTION_NOT_FOUND': '功能暂不可用',
      'CLOUD_PERMISSION_DENIED': '云开发未开通',
      'CLOUD_ENV_NOT_FOUND': '云开发环境不存在',
      'CLOUD_NOT_AVAILABLE': '云开发不可用',
      '-601034': '云开发未开通',
      '-601001': '云开发环境不存在'
    }
    
    const message = errorMap[error.code] || errorMap[error.errCode] || error.message || '操作失败'
    
    // 对于云开发相关错误，不显示错误提示，让业务层处理
    if (error.code && error.code.includes('CLOUD')) {
      console.log(`云开发错误: ${message}`)
      return
    }
    
    wx.showToast({
      title: message,
      icon: 'error',
      duration: 2000
    })
  }

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 创建单例
const request = new CloudRequest()

module.exports = request