/**
 * Parse flexible time strings:
 * - 24h: "8:00", "08:30", "17:00"
 * - 12h: "8am", "8:30 pm", "12 pm", "6p", "6:5p"
 * - compact: "830", "0900", "645pm", "1015am", "6 45 pm"
 * - bare hour: "8".."11" morning, "1".."7" afternoon
 */
export function looseParseTimeMinutes(raw: string): number | null {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, '')
    .replace(/([0-9:])([ap])$/, '$1$2m');

  if (!normalized) {
    return null;
  }

  let timeBody = normalized;
  let meridiem: 'am' | 'pm' | null = null;
  if (timeBody.endsWith('am') || timeBody.endsWith('pm')) {
    meridiem = timeBody.endsWith('am') ? 'am' : 'pm';
    timeBody = timeBody.slice(0, -2);
  }

  if (!timeBody) {
    return null;
  }

  const applyMeridiem = (hours: number, minutes: number): number | null => {
    if (minutes < 0 || minutes > 59) {
      return null;
    }
    if (meridiem) {
      if (hours < 1 || hours > 12) {
        return null;
      }
      if (meridiem === 'pm' && hours !== 12) {
        hours += 12;
      }
      if (meridiem === 'am' && hours === 12) {
        hours = 0;
      }
    } else if (hours < 0 || hours > 23) {
      return null;
    }
    return hours * 60 + minutes;
  };

  const colonMatch = timeBody.match(/^(\d{1,2}):(\d{1,2})$/);
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10);
    const minutes = parseInt(colonMatch[2], 10);
    return applyMeridiem(hours, minutes);
  }

  const digitsMatch = timeBody.match(/^(\d{1,4})$/);
  if (digitsMatch) {
    const digits = digitsMatch[1];
    if (digits.length <= 2) {
      let hours = parseInt(digits, 10);
      if (Number.isNaN(hours)) {
        return null;
      }
      if (meridiem) {
        return applyMeridiem(hours, 0);
      }
      if (hours < 1 || hours > 23) {
        return null;
      }
      if (hours <= 7) {
        hours += 12;
      }
      return hours * 60;
    }

    const splitAt = digits.length - 2;
    const hours = parseInt(digits.slice(0, splitAt), 10);
    const minutes = parseInt(digits.slice(splitAt), 10);
    return applyMeridiem(hours, minutes);
  }

  return null;
}
