/** Uint8Array → base64 string */
export function bytesToBase64(bytes: Uint8Array): string {
  const bufferCtor = globalThis.Buffer
  if (typeof bufferCtor?.from === 'function') {
    return bufferCtor.from(bytes).toString('base64')
  }

  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return globalThis.btoa(binary)
}

/** base64 string → Uint8Array */
export function base64ToBytes(base64: string): Uint8Array {
  const normalizedBase64 = base64
    .replaceAll(/[\r\n\t\s]/g, '')
    .replaceAll('-', '+')
    .replaceAll('_', '/')
  const bufferCtor = globalThis.Buffer
  if (typeof bufferCtor?.from === 'function') {
    return Uint8Array.from(bufferCtor.from(normalizedBase64, 'base64'))
  }

  const binaryString = globalThis.atob(normalizedBase64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

/** UTF-8 string → base64 string */
export function stringToBase64(str: string): string {
  return bytesToBase64(new TextEncoder().encode(str))
}

/** base64 string → UTF-8 string */
export function base64ToString(base64: string): string {
  return new TextDecoder().decode(base64ToBytes(base64))
}
