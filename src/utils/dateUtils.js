import { format, parseISO, isValid } from 'date-fns';

/**
 * ==============================================================================
 * سِجِل (Sejel) - دوال توحيد تنسيق التواريخ والوقت عبر date-fns
 * dateUtils.js - Unified Date & Time Formatter with date-fns
 * ==============================================================================
 * التخزين الداخلي الموحد: YYYY-MM-DD (ISO 8601)
 * العرض باللغة العربية: DD/MM/YYYY (مثال: 15/05/1990)
 * العرض باللغة الإنجليزية: MM/DD/YYYY (مثال: 05/15/1990)
 */

/**
 * تنسيق التاريخ للعرض بناءً على لغة التطبيق باستخدام date-fns
 * @param {string|Date} dateVal - التاريخ المخزن بصيغة ISO أو YYYY-MM-DD
 * @param {string} lang - 'ar' أو 'en'
 * @returns {string} - التاريخ المنسق
 */
export function formatDate(dateVal, lang = 'ar') {
  if (!dateVal) return '-';
  try {
    let dateObj;
    if (dateVal instanceof Date) {
      dateObj = dateVal;
    } else if (typeof dateVal === 'string') {
      const cleanStr = dateVal.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
        const [y, m, d] = cleanStr.split('-').map(Number);
        dateObj = new Date(y, m - 1, d);
      } else {
        dateObj = parseISO(cleanStr);
        if (!isValid(dateObj)) {
          dateObj = new Date(cleanStr);
        }
      }
    } else {
      dateObj = new Date(dateVal);
    }

    if (!isValid(dateObj)) return String(dateVal);

    const pattern = lang === 'ar' ? 'dd/MM/yyyy' : 'MM/dd/yyyy';
    return format(dateObj, pattern);
  } catch {
    return String(dateVal);
  }
}

/**
 * تنسيق التاريخ والوقت معاً للعرض
 */
export function formatDateTime(dateTimeVal, lang = 'ar') {
  if (!dateTimeVal) return '-';
  try {
    let dateObj;
    if (dateTimeVal instanceof Date) {
      dateObj = dateTimeVal;
    } else if (typeof dateTimeVal === 'string') {
      dateObj = parseISO(dateTimeVal);
      if (!isValid(dateObj)) {
        dateObj = new Date(dateTimeVal);
      }
    } else {
      dateObj = new Date(dateTimeVal);
    }

    if (!isValid(dateObj)) return String(dateTimeVal);

    const pattern = lang === 'ar' ? 'dd/MM/yyyy HH:mm' : 'MM/dd/yyyy HH:mm';
    return format(dateObj, pattern);
  } catch {
    return String(dateTimeVal);
  }
}

/**
 * تحويل أي تاريخ إلى صيغة التخزين الداخلية القياسية YYYY-MM-DD
 */
export function toStorageDate(dateVal) {
  if (!dateVal) return format(new Date(), 'yyyy-MM-dd');
  try {
    let dateObj;
    if (dateVal instanceof Date) {
      dateObj = dateVal;
    } else if (typeof dateVal === 'string') {
      const clean = dateVal.trim().split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
      dateObj = parseISO(dateVal);
      if (!isValid(dateObj)) dateObj = new Date(dateVal);
    } else {
      dateObj = new Date(dateVal);
    }

    if (!isValid(dateObj)) return String(dateVal).split('T')[0];
    return format(dateObj, 'yyyy-MM-dd');
  } catch {
    return String(dateVal).split('T')[0];
  }
}
