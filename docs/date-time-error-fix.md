# 日期时间错误修复文档

## 问题描述

在生成月度收支报表时出现 `RangeError: Invalid time value` 错误，错误发生在调用 `Date.toISOString()` 方法时。

### 错误堆栈
```
RangeError: Invalid time value
    at Date.toISOString (<anonymous>)
    at _callee$ (report.js? [sm]:19)
    at s (regeneratorRuntime.js?forceSync=true:1)
    ...
```

## 问题原因

1. **无效日期对象创建**: 当传入无效的年份或月份参数时，`new Date()` 会创建一个无效的日期对象
2. **缺少日期验证**: 代码中没有对日期对象的有效性进行验证就直接调用 `toISOString()` 方法
3. **参数传递问题**: 可能存在 `undefined`、`null` 或非数字类型的年份/月份参数传递

## 解决方案

### 1. 在 `services/report.js` 中添加日期验证

#### 修复 `generateMonthlyReport` 函数
```javascript
async function generateMonthlyReport(year, month) {
  try {
    // 获取所有交易记录
    const transactions = wx.getStorageSync('transactions') || []
    
    // 安全的日期创建和验证
    const monthStartDate = new Date(year, month - 1, 1)
    const monthEndDate = new Date(year, month, 0)
    
    // 验证日期是否有效
    if (isNaN(monthStartDate.getTime()) || isNaN(monthEndDate.getTime())) {
      throw new Error(`无效的日期参数: year=${year}, month=${month}`)
    }
    
    // 筛选指定月份的交易记录
    const monthStart = monthStartDate.toISOString().split('T')[0]
    const monthEnd = monthEndDate.toISOString().split('T')[0]
    // ... 其余代码
  }
}
```

#### 修复 `generateYearlyReport` 函数
```javascript
async function generateYearlyReport(year) {
  try {
    // 获取所有交易记录
    const transactions = wx.getStorageSync('transactions') || []
    
    // 安全的日期创建和验证
    const yearStartDate = new Date(year, 0, 1)
    const yearEndDate = new Date(year, 11, 31)
    
    // 验证日期是否有效
    if (isNaN(yearStartDate.getTime()) || isNaN(yearEndDate.getTime())) {
      throw new Error(`无效的年份参数: year=${year}`)
    }
    
    // 筛选指定年份的交易记录
    const yearStart = yearStartDate.toISOString().split('T')[0]
    const yearEnd = yearEndDate.toISOString().split('T')[0]
    // ... 其余代码
  }
}
```

#### 修复 `generateReport` 函数
```javascript
async function generateReport(params) {
  try {
    const { 
      startDate, 
      endDate, 
      dateRange, 
      currentYear, 
      currentMonth, 
      customStartDate, 
      customEndDate 
    } = params;
    
    // 验证输入参数
    if (!params || !dateRange) {
      throw new Error('缺少必要的参数: dateRange');
    }
    
    // 验证年份和月份参数
    if (dateRange === 'month' || dateRange === 'year') {
      if (typeof currentYear !== 'number' || currentYear < 1900 || currentYear > 2100) {
        throw new Error(`无效的年份参数: ${currentYear}`);
      }
      
      if (dateRange === 'month') {
        if (typeof currentMonth !== 'number' || currentMonth < 0 || currentMonth > 11) {
          throw new Error(`无效的月份参数: ${currentMonth}`);
        }
      }
    }
    
    // 验证自定义日期参数
    if (dateRange === 'custom') {
      if (!customStartDate || !customEndDate) {
        throw new Error('自定义日期范围缺少开始或结束日期');
      }
      
      const startDateObj = new Date(customStartDate);
      const endDateObj = new Date(customEndDate);
      
      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        throw new Error(`无效的自定义日期: startDate=${customStartDate}, endDate=${customEndDate}`);
      }
    }
    // ... 其余代码
  }
}
```

### 2. 在 `pages/reports/reports-simple.js` 中添加参数验证

#### 修复 `buildQueryParams` 函数
```javascript
buildQueryParams() {
  const { dateRange, currentYear, currentMonth, customStartDate, customEndDate } = this.data;
  
  let params = { dateRange };
  
  if (dateRange === 'month') {
    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0);
    
    // 验证日期有效性
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error(`无效的月份参数: year=${currentYear}, month=${currentMonth}`);
    }
    
    params.startDate = startDate.toISOString().slice(0, 10);
    params.endDate = endDate.toISOString().slice(0, 10);
    params.currentYear = currentYear;
    params.currentMonth = currentMonth;
  } else if (dateRange === 'year') {
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31);
    
    // 验证日期有效性
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error(`无效的年份参数: year=${currentYear}`);
    }
    
    params.startDate = startDate.toISOString().slice(0, 10);
    params.endDate = endDate.toISOString().slice(0, 10);
    params.currentYear = currentYear;
  } else if (dateRange === 'custom') {
    // 验证自定义日期格式
    const startDate = new Date(customStartDate);
    const endDate = new Date(customEndDate);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error(`无效的自定义日期: startDate=${customStartDate}, endDate=${customEndDate}`);
    }
    
    params.startDate = customStartDate;
    params.endDate = customEndDate;
  }
  
  return params;
}
```

## 修复效果

1. **防止无效日期**: 在创建日期对象后立即验证其有效性
2. **提供明确错误信息**: 当日期无效时，抛出包含具体参数信息的错误
3. **参数类型检查**: 验证年份和月份参数的类型和范围
4. **自定义日期验证**: 对用户输入的自定义日期进行格式和有效性检查

## 预防措施

1. **输入验证**: 在所有日期相关函数的入口处添加参数验证
2. **错误处理**: 使用 try-catch 包装日期操作，提供友好的错误提示
3. **类型检查**: 确保传入的年份和月份参数是有效的数字类型
4. **边界检查**: 验证年份和月份在合理范围内（如年份在1900-2100之间，月份在0-11之间）

## 测试建议

1. 测试无效年份参数（如 `undefined`, `null`, `"abc"`, `-1`, `3000`）
2. 测试无效月份参数（如 `undefined`, `null`, `"abc"`, `-1`, `12`）
3. 测试无效自定义日期格式（如 `"invalid-date"`, `"2023-13-01"`）
4. 测试边界情况（如闰年2月29日，月末日期等）

## 修复日期

2025年1月6日

## 修复人员

CodeBuddy AI Assistant