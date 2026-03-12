/** Uint8Array → base64 string (Node-optimized via Buffer) */
export function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64')
}

/** base64 string → Uint8Array (Node-optimized via Buffer) */
export function base64ToBytes(base64: string): Uint8Array {
  return Buffer.from(base64, 'base64')
}

/** UTF-8 string → base64 string (Node-optimized via Buffer) */
export function stringToBase64(str: string): string {
  return Buffer.from(str, 'utf-8').toString('base64')
}

/** base64 string → UTF-8 string (Node-optimized via Buffer) */
export function base64ToString(base64: string): string {
  return Buffer.from(base64, 'base64').toString('utf-8')
}
