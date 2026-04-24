import {
  HTML4_PUBLIC_PREFIXES,
  LIMITED_QUIRKY_PUBLIC_PREFIXES,
  QUIRKY_PUBLIC_MATCHES,
  QUIRKY_PUBLIC_PREFIXES,
  QUIRKY_SYSTEM_MATCHES,
} from './constants.js'

// Port of ~/dev/justhtml/src/justhtml/treebuilder_utils.py

export const InsertionMode = Object.freeze({
  INITIAL: 0,
  BEFORE_HTML: 1,
  BEFORE_HEAD: 2,
  IN_HEAD: 3,
  IN_HEAD_NOSCRIPT: 4,
  AFTER_HEAD: 5,
  TEXT: 6,
  IN_BODY: 7,
  AFTER_BODY: 8,
  AFTER_AFTER_BODY: 9,
  IN_TABLE: 10,
  IN_TABLE_TEXT: 11,
  IN_CAPTION: 12,
  IN_COLUMN_GROUP: 13,
  IN_TABLE_BODY: 14,
  IN_ROW: 15,
  IN_CELL: 16,
  IN_FRAMESET: 17,
  AFTER_FRAMESET: 18,
  AFTER_AFTER_FRAMESET: 19,
  IN_SELECT: 20,
  IN_TEMPLATE: 21,
})

export function isAllWhitespace(text: any) {
  if (!text) return true
  for (const ch of text) {
    if (ch !== '\t' && ch !== '\n' && ch !== '\f' && ch !== '\r' && ch !== ' ') return false
  }
  return true
}

function containsPrefix(prefixes: any, needle: any) {
  for (const prefix of prefixes) {
    if (needle.startsWith(prefix)) return true
  }
  return false
}

export function doctypeErrorAndQuirks(doctype: any, { iframeSrcdoc = false } = {}) {
  const name = doctype?.name ? String(doctype.name).toLowerCase() : null
  const publicId = doctype?.publicId ?? null
  const systemId = doctype?.systemId ?? null

  const acceptable = new Set([
    ['html', null, null].join('\u0000'),
    ['html', null, 'about:legacy-compat'].join('\u0000'),
    ['html', '-//W3C//DTD HTML 4.0//EN', null].join('\u0000'),
    ['html', '-//W3C//DTD HTML 4.0//EN', 'http://www.w3.org/TR/REC-html40/strict.dtd'].join(
      '\u0000'
    ),
    ['html', '-//W3C//DTD HTML 4.01//EN', null].join('\u0000'),
    ['html', '-//W3C//DTD HTML 4.01//EN', 'http://www.w3.org/TR/html4/strict.dtd'].join(
      '\u0000'
    ),
    [
      'html',
      '-//W3C//DTD XHTML 1.0 Strict//EN',
      'http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd',
    ].join('\u0000'),
    [
      'html',
      '-//W3C//DTD XHTML 1.1//EN',
      'http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd',
    ].join('\u0000'),
  ])

  const key = [name, publicId, systemId].join('\u0000')
  const parseError = !acceptable.has(key)

  const publicLower = publicId != null ? String(publicId).toLowerCase() : null
  const systemLower = systemId != null ? String(systemId).toLowerCase() : null

  let quirksMode
  if (doctype?.forceQuirks) {
    quirksMode = 'quirks'
  } else if (iframeSrcdoc) {
    quirksMode = 'no-quirks'
  } else if (name !== 'html') {
    quirksMode = 'quirks'
  } else if (publicLower && QUIRKY_PUBLIC_MATCHES.includes(publicLower)) {
    quirksMode = 'quirks'
  } else if (systemLower && QUIRKY_SYSTEM_MATCHES.includes(systemLower)) {
    quirksMode = 'quirks'
  } else if (publicLower && containsPrefix(QUIRKY_PUBLIC_PREFIXES, publicLower)) {
    quirksMode = 'quirks'
  } else if (publicLower && containsPrefix(LIMITED_QUIRKY_PUBLIC_PREFIXES, publicLower)) {
    quirksMode = 'limited-quirks'
  } else if (publicLower && containsPrefix(HTML4_PUBLIC_PREFIXES, publicLower)) {
    quirksMode = systemLower == null ? 'quirks' : 'limited-quirks'
  } else {
    quirksMode = 'no-quirks'
  }

  return [parseError, quirksMode]
}
