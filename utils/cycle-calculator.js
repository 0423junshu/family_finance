// utils/cycle-calculator.js - 统一周期计算工具
class CycleCalculator {
  
  // 获取周期设置
  static getCycleSetting() {
    const setting = wx.getStorageSync('cycleSetting') || { startDay: 1 }
    return {
      startDay: setting.startDay || 1,
      type: setting.type || 'monthly'
    }
  }
  
  // 计算指定日期所在的周期
  static calculateCycle(date = new Date()) {
    const cycleSetting = this.getCycleSetting()
    const startDay = cycleSetting.startDay
    
    const targetDate = new Date(date)
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth()
    const day = targetDate.getDate()
    
    let cycleStartDate, cycleEndDate
    
    if (day >= startDay) {
      // 当前日期在周期开始日之后，周期为本月startDay到下月startDay-1
      cycleStartDate = new Date(year, month, startDay)
      cycleEndDate = new Date(year, month + 1, startDay - 1)
    } else {
      // 当前日期在周期开始日之前，周期为上月startDay到本月startDay-1
      cycleStartDate = new Date(year, month - 1, startDay)
      cycleEndDate = new Date(year, month, startDay - 1)
    }
    
    return {
      startDate: cycleStartDate,
      endDate: cycleEndDate,
      startDay: startDay
    }
  }
  
  // 获取当前周期
  static getCurrentCycle() {
    return this.calculateCycle(new Date())
  }
  
  // 检查日期是否在指定周期内
  static isDateInCycle(date, cycle) {
    const targetDate = new Date(date)
    return targetDate >= cycle.startDate && targetDate <= cycle.endDate
  }
  
  // 格式化周期显示
  static formatCycle(cycle) {
    const startMonth = cycle.startDate.getMonth() + 1
    const startDay = cycle.startDate.getDate()
    const endMonth = cycle.endDate.getMonth() + 1
    const endDay = cycle.endDate.getDate()
    
    if (startMonth === endMonth) {
      return `${startMonth}月${startDay}日-${endDay}日`
    } else {
      return `${startMonth}月${startDay}日-${endMonth}月${endDay}日`
    }
  }
  
  // 修复周期设置
  static fixCycleSetting() {
    let cycleSetting = wx.getStorageSync('cycleSetting')
    
    if (!cycleSetting || !cycleSetting.startDay) {
      // 设置默认周期
      cycleSetting = {
        startDay: 1,
        type: 'monthly'
      }
      wx.setStorageSync('cycleSetting', cycleSetting)
      console.log('✓ 设置默认周期配置')
    }
    
    // 验证周期设置有效性
    if (cycleSetting.startDay < 1 || cycleSetting.startDay > 31) {
      cycleSetting.startDay = 1
      wx.setStorageSync('cycleSetting', cycleSetting)
      console.log('✓ 修复无效的周期起始日')
    }
    
    return cycleSetting
  }
}

module.exports = CycleCalculator