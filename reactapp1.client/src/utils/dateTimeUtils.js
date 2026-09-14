// src/utils/dateTimeUtils.js

/**
 * 统一的时间格式化配置
 * 使用英文locale，但小时制跟随浏览器设置（12/24小时制）
 */

// 获取浏览器偏好的小时制
const browserHourCycle = new Intl.DateTimeFormat(undefined, { 
  hour: "numeric" 
}).resolvedOptions().hourCycle;

/**
 * 格式化单个日期时间
 * @param {string|Date} dateTime - ISO字符串或Date对象
 * @param {Object} options - Intl.DateTimeFormat选项
 * @returns {string} 格式化后的时间字符串
 */
export function formatDateTime(dateTime, options = {}) {
  if (!dateTime) return "—";
  
  const date = new Date(dateTime);
  if (isNaN(date.getTime())) return "—";
  
  // 如果没有传入自定义options，使用默认的dateStyle和timeStyle
  const formatOptions = Object.keys(options).length === 0
    ? {
        dateStyle: "medium",  // 例如: Jan 15, 2025
        timeStyle: "short",   // 例如: 2:30 PM 或 14:30
        hourCycle: browserHourCycle
      }
    : {
        ...options,
        hourCycle: browserHourCycle
      };
  
  return new Intl.DateTimeFormat("en", { ...formatOptions, timeZone: TZ }).format(date);
}

/**
 * 格式化日期时间范围（用于列表显示）
 * @param {string|Date} start - 开始时间
 * @param {string|Date} end - 结束时间
 * @returns {string} 格式化后的时间范围
 */
export function formatDateTimeRange(start, end) {
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  
  const validStart = startDate && !isNaN(startDate.getTime());
  const validEnd = endDate && !isNaN(endDate.getTime());
  
  if (!validStart && !validEnd) return "—";
  if (!validStart) {
    return `– ${formatDateTime(endDate, { 
      month: "short", 
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    })}`;
  }
  if (!validEnd) {
    return `${formatDateTime(startDate, { 
      month: "short", 
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    })} –`;
  }
  
  // 检查是否同一天
  const sameDay = startDate.getFullYear() === endDate.getFullYear()
               && startDate.getMonth() === endDate.getMonth()
               && startDate.getDate() === endDate.getDate();
  
  if (sameDay) {
    const dateStr = new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hourCycle: browserHourCycle
    }).format(startDate);
    
    const startTime = new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
      hourCycle: browserHourCycle
    }).format(startDate);
    
    const endTime = new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
      hourCycle: browserHourCycle
    }).format(endDate);
    
    return `${dateStr}, ${startTime} – ${endTime}`;
  }
  
  // 不同天
  const startStr = formatDateTime(startDate, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
  
  const endStr = formatDateTime(endDate, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
  
  return `${startStr} – ${endStr}`;
}

/**
 * 格式化为详细的日期时间（用于详情页显示）
 * @param {string|Date} dateTime 
 * @returns {string}
 */
export function formatDateTimeLong(dateTime) {
  if (!dateTime) return "—";
  
  const date = new Date(dateTime);
  if (isNaN(date.getTime())) return "—";
  
  return new Intl.DateTimeFormat("en", {
    weekday: "long",      // Monday
    year: "numeric",      // 2025
    month: "long",        // January
    day: "numeric",       // 15
    hour: "numeric",      // 2 PM 或 14
    minute: "2-digit",    // 30
    hourCycle: browserHourCycle
  }).format(date);
}

/**
 * 转换ISO时间为本地datetime-local输入框格式
 * @param {string} isoString - ISO 8601格式的时间字符串
 * @returns {string} YYYY-MM-DDTHH:mm格式
 */
export function isoToLocalInput(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  
  // 关键修复：datetime-local输入框需要本地时间，但要从UTC正确转换
  // 方法：减去时区偏移，然后格式化为本地时间字符串
  const offsetMinutes = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offsetMinutes * 60 * 1000);
  
  // 使用toISOString()然后截取前16位，这样得到的就是正确的本地时间格式
  return localDate.toISOString().slice(0, 16);
}

/**
 * 转换本地datetime-local格式为ISO字符串
 * @param {string} localInput - YYYY-MM-DDTHH:mm格式
 * @returns {string|null} ISO 8601格式或null
 */
export function localInputToIso(localInput) {
  if (!localInput) return null;
  const date = new Date(localInput);
  return isNaN(date.getTime()) ? null : date.toISOString();
}
// ====== New: timezone + iso sanitizers ======
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Treat "ISO-like without timezone" as UTC by appending 'Z'. Also handle 'YYYY-MM-DD HH:mm' → 'T'. */
// Treat "ISO-like without timezone" as LOCAL time, then normalize to UTC
// dateTimeUtils.js 中修改 fixIsoTZ 函数

/** Treat "ISO-like without timezone" as UTC by appending 'Z'. Also handle 'YYYY-MM-DD HH:mm' → 'T'. */
export function fixIsoTZ(v) {
  if (v == null) return null;
  if (typeof v === "number") return new Date(v).toISOString();

  let s = String(v).trim();

  // Allow "MM - DD YYYY - HH: MM: [ss]" - to become "YYYY - MM - DDTHH: MM [: ss]."
  if (/^\d{2} - \d{2} - \d{4} - \d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(s)) {
    s = s.replace(/(\d{2}) - (\d{2}) - (\d{4}) - (\d{2}:\d{2})(?::(\d{2}(?:\.\d{1,3})?)?)?/, "$3-$1-$2T$4$5");
  }

  // Checks if a time zone identifier already exists
  const hasZone = /[zZ]|[+-]\d{2}:\d{2}$/.test(s);

  // Checks if the format is ISO-like but without a time zone
  const isoNoZone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(s);

  // Key change: If you are ISO-like but don't have a time zone, use 'Z' as UTC
  const padded = isoNoZone && !hasZone ? `${s}Z` : s;

  const d = new Date(padded);
  return isNaN(d) ? null : d.toISOString();
} 

/** Normalize event time fields to startAt/endAt using fixIsoTZ */
export function normalizeEventTimes(e = {}) {
  return {
    ...e,
    startAt: fixIsoTZ(e.startAt ?? e.StartAt ?? e.startTime ?? e.startDateTime ?? e.date ?? e.start ?? e.beginTime),
    endAt:   fixIsoTZ(e.endAt   ?? e.EndAt   ?? e.endTime   ?? e.endDateTime   ?? e.finish ?? e.end),
  };
}
