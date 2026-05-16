import { SVG_UNIT_TO_PIXEL_CONVERSIONS } from '../constants'
import {
  downloadAndCacheImage,
  guessMimeTypeFromBytes,
  imageToBase64,
  parseDataUrl,
} from './image-to-base64'
import { isInternalUrl } from './url'

type ImageMimeType =
  | 'image/bmp'
  | 'image/gif'
  | 'image/jpeg'
  | 'image/png'
  | 'image/svg+xml'
  | 'image/tiff'
  | 'image/webp'
type CaughtError =
  | Error
  | boolean
  | number
  | string
  | null
  | undefined
  | { message?: string; name?: string; toString(): string }
type ErrorWithCause = Error & { cause?: Error }

const toError = (error: CaughtError): Error => {
  if (error instanceof Error) {
    return error
  }
  if (typeof error === 'string') {
    return new Error(error)
  }
  if (error && typeof error === 'object' && typeof error.message === 'string') {
    const normalizedError = new Error(error.message)
    if (typeof error.name === 'string' && error.name.length > 0) {
      normalizedError.name = error.name
    }
    return normalizedError
  }

  return new Error(String(error ?? 'Unknown error'))
}

const MIME_BY_EXTENSION = {
  bmp: 'image/bmp',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  webp: 'image/webp',
} as const satisfies Record<string, ImageMimeType>

const toBase64ByteArray = (base64String: string): Uint8Array => {
  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(base64String.substring(0, 50), 'base64'))
  }

  const binaryString = globalThis.atob(base64String.substring(0, 50))
  const byteArray = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i += 1) {
    byteArray[i] = binaryString.charCodeAt(i)
  }
  return byteArray
}

/**
 * Tries to infer MIME type by checking magic bytes in a base64 image string.
 */
export const guessMimeTypeFromBase64 = (base64String: string): ImageMimeType | false => {
  const byteArray = toBase64ByteArray(base64String)

  if (byteArray[0] === 0xff && byteArray[1] === 0xd8 && byteArray[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    byteArray[0] === 0x89 &&
    byteArray[1] === 0x50 &&
    byteArray[2] === 0x4e &&
    byteArray[3] === 0x47
  ) {
    return 'image/png'
  }
  if (byteArray[0] === 0x47 && byteArray[1] === 0x49 && byteArray[2] === 0x46) {
    return 'image/gif'
  }
  if (byteArray[0] === 0x42 && byteArray[1] === 0x4d) {
    return 'image/bmp'
  }
  if (
    byteArray[0] === 0x49 &&
    byteArray[1] === 0x49 &&
    byteArray[2] === 0x2a &&
    byteArray[3] === 0x00
  ) {
    return 'image/tiff'
  }
  if (
    byteArray[0] === 0x4d &&
    byteArray[1] === 0x4d &&
    byteArray[2] === 0x00 &&
    byteArray[3] === 0x2a
  ) {
    return 'image/tiff'
  }

  return false
}

const extractExtension = (source: string): string | null => {
  if (!source) return null

  try {
    const parsedUrl = new URL(source)
    const fileName = parsedUrl.pathname.split('/').pop() || ''
    const extension = fileName.split('.').pop()
    return extension ? extension.toLowerCase() : null
  } catch {
    const withoutQuery = source.split('?')[0].split('#')[0]
    const extension = withoutQuery.split('.').pop()
    if (!extension || extension === withoutQuery) {
      return null
    }
    return extension.toLowerCase()
  }
}

/**
 * Determines MIME type from file extension or base64 magic bytes.
 */
export const getMimeType = (source: string, base64?: string): ImageMimeType | false => {
  const extension = extractExtension(source)
  if (extension && MIME_BY_EXTENSION[extension]) {
    return MIME_BY_EXTENSION[extension]
  }

  if (base64 && base64.length > 0) {
    return guessMimeTypeFromBase64(base64)
  }

  return false
}

/**
 * Checks whether input MIME type or extension indicates SVG content.
 */
export const isSVG = (mimeTypeOrExtension?: string | null): boolean => {
  if (!mimeTypeOrExtension) return false

  const normalized = mimeTypeOrExtension.toLowerCase().trim()
  return (
    normalized === 'image/svg+xml' ||
    normalized === 'image/svg' ||
    normalized === '.svg' ||
    normalized === 'svg' ||
    normalized.endsWith('.svg')
  )
}

const convertSVGUnitToPixels = (value: number, unit: string): number => {
  const factor = SVG_UNIT_TO_PIXEL_CONVERSIONS[unit] || 1
  return Math.round(value * factor)
}

/**
 * Extract SVG width/height in pixels, supporting units and viewBox fallback.
 */
export const parseSVGDimensions = (
  svgString: string
): { height: number; width: number } => {
  const widthMatch = svgString.match(/width\s*=\s*["']?([0-9.]+)([a-z%]*)/i)
  const heightMatch = svgString.match(/height\s*=\s*["']?([0-9.]+)([a-z%]*)/i)

  let width: number | undefined
  let height: number | undefined

  if (widthMatch) {
    width = convertSVGUnitToPixels(
      Number.parseFloat(widthMatch[1]),
      widthMatch[2]?.toLowerCase() || 'px'
    )
  }
  if (heightMatch) {
    height = convertSVGUnitToPixels(
      Number.parseFloat(heightMatch[1]),
      heightMatch[2]?.toLowerCase() || 'px'
    )
  }

  if (!width || !height) {
    const viewBoxMatch = svgString.match(/viewBox\s*=\s*["']?([0-9.\s-]+)["']?/i)
    if (viewBoxMatch) {
      const parts = viewBoxMatch[1].trim().split(/\s+/)
      if (parts.length === 4) {
        const vbW = Number.parseFloat(parts[2])
        const vbH = Number.parseFloat(parts[3])
        if (!width && height && vbW && vbH) width = Math.round((height * vbW) / vbH)
        else if (width && !height && vbW && vbH) height = Math.round((width * vbH) / vbW)
        else if (!width && !height) {
          width = Math.round(vbW)
          height = Math.round(vbH)
        }
      }
    }
  }

  return { width: width || 300, height: height || 150 }
}

/**
 * Converts SVG base64 content to PNG base64 using browser Canvas APIs only.
 * Returns null when canvas APIs are unavailable.
 */
const convertSVGtoPNGCanvas = async (
  svgBase64: string,
  width: number,
  height: number
): Promise<string | null> => {
  const CanvasClass = typeof OffscreenCanvas !== 'undefined' ? OffscreenCanvas : null

  if (!CanvasClass) {
    return null
  }

  const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`
  const canvas = new CanvasClass(width, height)
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return null
  }

  try {
    const res = await fetch(svgDataUrl)
    const blob = await res.blob()
    const bitmap = await createImageBitmap(blob, {
      resizeWidth: width,
      resizeHeight: height,
    })
    ctx.drawImage(bitmap, 0, 0, width, height)
    const pngBlob = await canvas.convertToBlob({ type: 'image/png' })
    const arrayBuffer = await pngBlob.arrayBuffer()

    if (typeof Buffer !== 'undefined') {
      return Buffer.from(arrayBuffer).toString('base64')
    }
    const bytes = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i])
    }
    return globalThis.btoa(binary)
  } catch {
    return null
  }
}

/**
 * Converts SVG base64 to PNG base64.
 * Uses only browser APIs and never attempts Node-native processing.
 * Returns null when conversion is unavailable — SVG will be embedded natively.
 */
export const convertSVGtoPNG = async (
  svgBase64: string,
  width: number,
  height: number
): Promise<string | null> => {
  return convertSVGtoPNGCanvas(svgBase64, width, height)
}

/**
 * Downloads an image URL and returns base64 content using fetch.
 */
export const downloadImageToBase64 = async (
  url: string,
  timeout = 5000
): Promise<string> => {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(String(url).trim())
  } catch {
    parsedUrl = new URL(String(url).trim(), 'http://dummy.base')
  }
  const protocol = parsedUrl.protocol
  if (
    protocol !== 'http:' &&
    protocol !== 'https:' &&
    protocol !== 'data:' &&
    protocol !== 'blob:'
  ) {
    throw new Error('Invalid URL')
  }

  if (isInternalUrl(url)) {
    throw new Error('Invalid URL')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, { signal: controller.signal })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const blob = await response.blob()
    if (blob.size === 0) {
      throw new Error('Empty response data received')
    }

    const arrayBuffer = await blob.arrayBuffer()

    if (typeof Buffer !== 'undefined') {
      return Buffer.from(arrayBuffer).toString('base64')
    }

    const bytes = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i])
    }
    return globalThis.btoa(binary)
  } catch (error) {
    const normalizedError = toError(error)
    if (normalizedError.name === 'AbortError') {
      const timeoutError: ErrorWithCause = new Error(`Request timeout after ${timeout}ms`)
      timeoutError.cause = normalizedError
      throw timeoutError
    }
    throw normalizedError
  } finally {
    clearTimeout(timeoutId)
  }
}

export { downloadAndCacheImage, imageToBase64, parseDataUrl, guessMimeTypeFromBytes }

export default imageToBase64
