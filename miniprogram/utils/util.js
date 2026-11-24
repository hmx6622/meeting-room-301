// utils/util.js —— 全局通用工具函数

// 日期格式化：Date -> 'YYYY-MM-DD'
function formatDate(date) {
  const d = date || new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 时间戳 -> 'HH:MM'（24小时制）
function formatTime(timestamp) {
  const d = new Date(timestamp)
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}

// 时间戳 -> 'YYYY-MM-DD HH:MM'
function formatDateTime(timestamp) {
  return `${formatDate(new Date(timestamp))} ${formatTime(timestamp)}`
}

// 把 'YYYY-MM-DD' + 'HH:MM' 转成时间戳
// 用多参数构造、明确按手机本地时间，避免真机把 ISO 字符串当 UTC 解析、与模拟器差 8 小时
function toTimestamp(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [h, min] = timeStr.split(':').map(Number)
  return new Date(y, m - 1, d, h, min, 0).getTime()
}

// 状态码 -> 中文文本
const STATUS_MAP = {
  0: '待审批',
  1: '已通过',
  2: '已驳回',
  3: '已取消'
}

// 状态码 -> 标签样式类名
const STATUS_CLASS = {
  0: 'tag-pending',
  1: 'tag-pass',
  2: 'tag-reject',
  3: 'tag-cancel'
}

// 简单手机号校验：11 位数字、1 开头
function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone)
}

// 轻提示封装
function toast(title, icon) {
  wx.showToast({
    title,
    icon: icon || 'none',
    duration: 2000
  })
}

module.exports = {
  formatDate,
  formatTime,
  formatDateTime,
  toTimestamp,
  STATUS_MAP,
  STATUS_CLASS,
  isValidPhone,
  toast
}
