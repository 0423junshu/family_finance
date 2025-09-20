/* B3: date utils unify */
function pad2(n) {
  return String(n).padStart(2, '0');
}
function toDate(y, m, d) {
  return new Date(y, m, d);
}
function formatDate(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function isValidDateStr(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** 当月起止（month0: 0-based） */
function buildMonthRange(year, month0) {
  const start = toDate(year, month0, 1);
  const end = toDate(year, month0 + 1, 0);
  return { startDate: formatDate(start), endDate: formatDate(end) };
}

/** 当年起止 */
function buildYearRange(year) {
  const start = toDate(year, 0, 1);
  const end = toDate(year, 11, 31);
  return { startDate: formatDate(start), endDate: formatDate(end) };
}

/** 基于年月(YYYY-MM)生成自定义周期起止：起为1号，止为当月最后一天 */
function buildCustomRange(startYYYYMM, endYYYYMM) {
  if (typeof startYYYYMM !== 'string' || typeof endYYYYMM !== 'string') return { startDate: '', endDate: '' };
  const sm = startYYYYMM.split('-').map(Number);
  const em = endYYYYMM.split('-').map(Number);
  if (sm.length !== 2 || em.length !== 2) return { startDate: '', endDate: '' };
  const ys = sm[0], ms = sm[1];
  const ye = em[0], me = em[1];
  if (!Number.isFinite(ys) || !Number.isFinite(ms) || !Number.isFinite(ye) || !Number.isFinite(me)) {
    return { startDate: '', endDate: '' };
  }
  const start = toDate(ys, ms - 1, 1);
  const end = toDate(ye, me, 0);
  return { startDate: formatDate(start), endDate: formatDate(end) };
}

module.exports = {
  pad2,
  isValidDate: isValidDateStr,
  buildMonthRange,
  buildYearRange,
  buildCustomRange,
};