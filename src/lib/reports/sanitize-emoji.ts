/**
 * Sanitize emoji characters for PDF rendering.
 *
 * Helvetica (the built-in PDF font) cannot render emoji codepoints.
 * Instead of mojibake like ">â" or "=ª", we strip emojis before text
 * enters the PDF renderer so the copy remains clean and readable.
 */

// Comprehensive emoji regex using the `u` flag for proper Unicode codepoint matching.
// Covers: emoticons, dingbats, symbols, variation selectors, modifiers, ZWJ sequences,
// flags, supplemental symbols, chess symbols, and extended pictographics.
// eslint-disable-next-line no-misleading-character-class
const EMOJI_REGEX = new RegExp(
  '[' +
  '\u{1F600}-\u{1F64F}' + // Emoticons
  '\u{1F300}-\u{1F5FF}' + // Misc Symbols & Pictographs
  '\u{1F680}-\u{1F6FF}' + // Transport & Map
  '\u{1F1E0}-\u{1F1FF}' + // Flags (regional indicators)
  '\u{1F900}-\u{1F9FF}' + // Supplemental Symbols & Pictographs
  '\u{1FA00}-\u{1FA6F}' + // Chess Symbols
  '\u{1FA70}-\u{1FAFF}' + // Symbols & Pictographs Extended-A
  '\u{2600}-\u{26FF}' +   // Misc Symbols
  '\u{2700}-\u{27BF}' +   // Dingbats
  '\u{FE00}-\u{FE0F}' +   // Variation Selectors
  '\u{200D}' +             // ZWJ
  '\u{20E3}' +             // Combining Enclosing Keycap
  '\u{E0020}-\u{E007F}' + // Tags
  '\u{2194}-\u{2199}' +   // Arrows
  '\u{21A9}-\u{21AA}' +   // Hook Arrows
  '\u{231A}-\u{231B}' +   // Watch/Hourglass
  '\u{23E9}-\u{23F3}' +   // Media control symbols
  '\u{23F8}-\u{23FA}' +   // Media control symbols
  '\u{25AA}-\u{25AB}' +   // Small squares
  '\u{25B6}' +             // Play button
  '\u{25C0}' +             // Reverse button
  '\u{25FB}-\u{25FE}' +   // Medium squares
  '\u{2934}-\u{2935}' +   // Curved arrows
  '\u{2B05}-\u{2B07}' +   // Directional arrows
  '\u{2B1B}-\u{2B1C}' +   // Large squares
  '\u{2B50}' +             // Star
  '\u{2B55}' +             // Circle
  '\u{3030}' +             // Wavy Dash
  '\u{303D}' +             // Part Alternation Mark
  '\u{3297}' +             // Circled Ideograph Congratulation
  '\u{3299}' +             // Circled Ideograph Secret
  ']',
  'gu'
);

// Common mojibake byte sequences that result from emoji encoding failures.
// Used for both detection AND cleaning as a second-pass safety net.
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
  /ðŸ[\x80-\xBF]*/g,
  /â[\x80-\xBF][\x80-\xBF]?/g,
  /Ã[\x80-\xBF]/g,
  /Â[\x80-\xBF]/g,
  /=\s*ñ/g,
  /=\s*%/g,
  /=\s*š/g,
  /=\s*°/g,
  /=\s*G/g,
  /=\s*\./g,
];

/**
 * Replace emoji characters and mojibake artifacts with empty string.
 * Two-pass approach: first strip Unicode emoji codepoints, then clean
 * any mojibake byte sequences that slipped through as raw UTF-8 bytes.
 */
export function stripEmojis(text: string): string {
  if (!text) return text;
  let result = text.replace(EMOJI_REGEX, '');
  // Second pass: clean mojibake artifacts from pre-existing encoding corruption
  for (const pattern of MOJIBAKE_PATTERNS) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, '');
  }
  return result.replace(/  +/g, ' ').trim();
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
