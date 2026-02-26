/**
 * Sanitize emoji characters for PDF rendering.
 *
 * Helvetica (the built-in PDF font) cannot render emoji codepoints.
 * Instead of mojibake like ">â" or "=ª", we strip emojis and replace them
 * with a bracketed placeholder so the copy remains usable.
 */

// Regex that matches most emoji codepoints using explicit Unicode ranges.
// Covers: emoticons, dingbats, symbols, variation selectors, modifiers, ZWJ sequences, flags.
// Uses explicit ranges because TS target may not support \p{Emoji_Presentation}.
// eslint-disable-next-line no-misleading-character-class
const EMOJI_REGEX = /[\u2600-\u27BF\u2B50\u2934-\u2935\u3030\u303D\u3297\u3299\uFE0F\u200D\u20E3\u2702-\u27B0\u2194-\u2199\u21AA\u21A9\u231A\u231B\u23E9-\u23F3\u23F8-\u23FA\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2611\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/g;

// Common mojibake patterns that result from emoji encoding failures
const MOJIBAKE_PATTERNS = [
  />\s*â/g,
  /=\s*ª/g,
  />\s*ã/g,
  /=\s*«/g,
  /<\s*Ë/g,
  /=\s*v/g,
  /=\s*¼/g,
  /Ã\s*¢/g,
  /Ã\s*°/g,
  /Â\s*©/g,
  /Â\s*®/g,
  /ðŸ/g,
  /â\x80/g,
  /Ã\x82/g,
];

/**
 * Replace emoji characters with empty string (clean removal).
 * Preserves surrounding text and spacing.
 */
export function stripEmojis(text: string): string {
  if (!text) return text;
  return text
    .replace(EMOJI_REGEX, '')
    // Clean up any doubled spaces left after removal
    .replace(/  +/g, ' ')
    .trim();
}

/**
 * Recursively sanitize all string values in an object/array.
 * Returns a new object with emojis stripped from every string field.
 */
export function sanitizeForPDF<T>(data: T): T {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return stripEmojis(data) as T;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeForPDF(item)) as T;
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      // Skip non-text fields that shouldn't be sanitized (URLs, IDs, etc.)
      if (key.endsWith('Url') || key.endsWith('url') || key === 'id' || key === 'adId' || key === 'referenceAdId') {
        result[key] = value;
      } else {
        result[key] = sanitizeForPDF(value);
      }
    }
    return result as T;
  }

  return data;
}

/**
 * Detect mojibake in text — signs that emoji encoding failed.
 * Returns an array of detected patterns for logging/flagging.
 */
export function detectMojibake(text: string): string[] {
  if (!text) return [];

  const found: string[] = [];
  for (const pattern of MOJIBAKE_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) {
      found.push(match[0]);
    }
  }
  return found;
}

/**
 * Scan an entire data structure for mojibake.
 * Returns { clean: boolean, issues: string[] } where issues lists
 * the fields and patterns found.
 */
export function scanForMojibake(data: unknown, path = ''): { clean: boolean; issues: string[] } {
  const issues: string[] = [];

  if (typeof data === 'string') {
    const found = detectMojibake(data);
    if (found.length > 0) {
      issues.push(`${path}: found mojibake patterns [${found.join(', ')}]`);
    }
    return { clean: issues.length === 0, issues };
  }

  if (Array.isArray(data)) {
    data.forEach((item, i) => {
      const result = scanForMojibake(item, `${path}[${i}]`);
      issues.push(...result.issues);
    });
    return { clean: issues.length === 0, issues };
  }

  if (data !== null && typeof data === 'object') {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const result = scanForMojibake(value, path ? `${path}.${key}` : key);
      issues.push(...result.issues);
    }
  }

  return { clean: issues.length === 0, issues };
}
