type XmlEscapable =
  | bigint
  | boolean
  | number
  | string
  | symbol
  | null
  | undefined
  | { toString(): string }

export const escapeXml = (value: XmlEscapable): string =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

export default escapeXml
