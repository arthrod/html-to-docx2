type XmlEscapable =
  | bigint
  | boolean
  | number
  | string
  | symbol
  | null
  | undefined
  | { toString(): string }

// ⚡ Bolt: Replaced chained regex replaces with a manual for loop using charCodeAt and substring.
// This is significantly faster in V8/Bun by preventing intermediate string allocations and reducing GC pressure.
export const escapeXml = (value: XmlEscapable): string => {
  const str = String(value)
  let result = ''
  let lastIndex = 0

  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i)
    let escape = ''

    switch (charCode) {
      case 38: // &
        escape = '&amp;'
        break
      case 60: // <
        escape = '&lt;'
        break
      case 62: // >
        escape = '&gt;'
        break
      case 34: // "
        escape = '&quot;'
        break
      case 39: // '
        escape = '&apos;'
        break
      default:
        continue
    }

    result += str.substring(lastIndex, i) + escape
    lastIndex = i + 1
  }

  return lastIndex === 0 ? str : result + str.substring(lastIndex)
}

export default escapeXml
