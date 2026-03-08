type XmlEscapable =
  | bigint
  | boolean
  | number
  | string
  | symbol
  | null
  | undefined
  | { toString(): string }

export const escapeXml = (value: XmlEscapable): string => {
  const str = String(value)
  let res = ''
  let lastIndex = 0
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code === 38) {
      res += str.substring(lastIndex, i) + '&amp;'
      lastIndex = i + 1
    } else if (code === 60) {
      res += str.substring(lastIndex, i) + '&lt;'
      lastIndex = i + 1
    } else if (code === 62) {
      res += str.substring(lastIndex, i) + '&gt;'
      lastIndex = i + 1
    } else if (code === 34) {
      res += str.substring(lastIndex, i) + '&quot;'
      lastIndex = i + 1
    } else if (code === 39) {
      res += str.substring(lastIndex, i) + '&apos;'
      lastIndex = i + 1
    }
  }
  if (lastIndex === 0) return str
  return res + str.substring(lastIndex)
}

export default escapeXml
