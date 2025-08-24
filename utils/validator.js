// utils/validator.js
// 数据验证工具

class Validator {
  // 验证规则
  rules = {
    required: (value, message = '此字段为必填项') => {
      if (value === null || value === undefined || value === '') {
        return message
      }
      return null
    },

    number: (value, message = '请输入有效数字') => {
      if (value !== '' && isNaN(Number(value))) {
        return message
      }
      return null
    },

    positiveNumber: (value, message = '请输入正数') => {
      if (value !== '' && (isNaN(Number(value)) || Number(value) <= 0)) {
        return message
      }
      return null
    },

    maxLength: (maxLen, message) => (value) => {
      if (value && value.length > maxLen) {
        return message || `最多输入${maxLen}个字符`
      }
      return null
    },

    minLength: (minLen, message) => (value) => {
      if (value && value.length < minLen) {
        return message || `至少输入${minLen}个字符`
      }
      return null
    },

    email: (value, message = '请输入有效邮箱地址') => {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return message
      }
      return null
    },

    phone: (value, message = '请输入有效手机号') => {
      if (value && !/^1[3-9]\d{9}$/.test(value)) {
        return message
      }
      return null
    },

    date: (value, message = '请输入有效日期') => {
      if (value && isNaN(Date.parse(value))) {
        return message
      }
      return null
    },

    amount: (value, message = '请输入有效金额') => {
      if (value !== '' && (isNaN(Number(value)) || Number(value) < 0)) {
        return message
      }
      return null
    }
  }

  // 验证单个字段
  validateField(value, rules) {
    for (const rule of rules) {
      let validator, message
      
      if (typeof rule === 'string') {
        validator = this.rules[rule]
        message = undefined
      } else if (typeof rule === 'function') {
        validator = rule
        message = undefined
      } else if (typeof rule === 'object') {
        validator = this.rules[rule.type] || rule.validator
        message = rule.message
      }
      
      if (validator) {
        const error = validator(value, message)
        if (error) {
          return error
        }
      }
    }
    return null
  }

  // 验证表单
  validateForm(data, schema) {
    const errors = {}
    let isValid = true
    
    Object.keys(schema).forEach(field => {
      const rules = schema[field]
      const value = data[field]
      const error = this.validateField(value, rules)
      
      if (error) {
        errors[field] = error
        isValid = false
      }
    })
    
    return { isValid, errors }
  }

  // 交易记录验证规则
  getTransactionSchema() {
    return {
      amount: ['required', 'positiveNumber'],
      categoryId: ['required'],
      accountId: ['required'],
      date: ['required', 'date'],
      description: [this.rules.maxLength(100)]
    }
  }

  // 账户验证规则
  getAccountSchema() {
    return {
      name: ['required', this.rules.maxLength(20)],
      type: ['required'],
      balance: ['required', 'amount']
    }
  }

  // 预算验证规则
  getBudgetSchema() {
    return {
      name: ['required', this.rules.maxLength(20)],
      amount: ['required', 'positiveNumber'],
      startDate: ['required', 'date'],
      endDate: ['required', 'date']
    }
  }

  // 目标验证规则
  getGoalSchema() {
    return {
      name: ['required', this.rules.maxLength(20)],
      targetAmount: ['required', 'positiveNumber'],
      targetDate: ['required', 'date']
    }
  }
}

// 创建单例
const validator = new Validator()

module.exports = validator
