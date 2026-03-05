import axios from 'axios'

import { SVG_UNIT_TO_PIXEL_CONVERSIONS } from '../constants'
import {
  downloadAndCacheImage,
  guessMimeTypeFromBytes,
  imageToBase64,
  parseDataUrl,
} from './image-to-base64'

type SVGConvertOptions = {
  density?: number
  height?: number
  width?: number
}

type RuntimeBuffer = {
  from: (
    input: string | ArrayBuffer | ArrayLike<number> | ArrayBufferView,
    encoding?: BufferEncoding
  ) => Buffer
  isBuffer: (input: unknown) => boolean
}

const MIME_BY_EXTENSION: Record<string, string> = {
  bmp: 'image/bmp',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  webp: 'image/webp',
}

const getRuntimeBuffer = (): RuntimeBuffer | null => {
  const runtime = globalThis as typeof globalThis & { Buffer?: RuntimeBuffer }
  const runtimeBuffer = runtime.Buffer
  if (
    runtimeBuffer &&
    typeof runtimeBuffer.from === 'function' &&
    typeof runtimeBuffer.isBuffer === 'function'
  ) {
    return runtimeBuffer
  }
  return null
}

const toBase64ByteArray = (base64String: string): Uint8Array => {
  const runtimeBuffer = getRuntimeBuffer()
  if (runtimeBuffer) {
    return Uint8Array.from(runtimeBuffer.from(base64String.substring(0, 50), 'base64'))
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
export const guessMimeTypeFromBase64 = (base64String: string): string | false => {
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
export const getMimeType = (source: string, base64?: string): string | false => {
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
  const factor =
    SVG_UNIT_TO_PIXEL_CONVERSIONS[unit as keyof typeof SVG_UNIT_TO_PIXEL_CONVERSIONS] || 1

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
    const value = Number.parseFloat(widthMatch[1])
    const unit = widthMatch[2]?.toLowerCase() || 'px'
    width = convertSVGUnitToPixels(value, unit)
  }

  if (heightMatch) {
    const value = Number.parseFloat(heightMatch[1])
    const unit = heightMatch[2]?.toLowerCase() || 'px'
    height = convertSVGUnitToPixels(value, unit)
  }

  if (!width || !height) {
    const viewBoxMatch = svgString.match(/viewBox\s*=\s*["']?([0-9.\s-]+)["']?/i)
    if (viewBoxMatch) {
      const parts = viewBoxMatch[1].trim().split(/\s+/)
      if (parts.length === 4) {
        const viewBoxWidth = Number.parseFloat(parts[2])
        const viewBoxHeight = Number.parseFloat(parts[3])

        if (!width && height && viewBoxWidth && viewBoxHeight) {
          width = Math.round((height * viewBoxWidth) / viewBoxHeight)
        } else if (width && !height && viewBoxWidth && viewBoxHeight) {
          height = Math.round((width * viewBoxHeight) / viewBoxWidth)
        } else if (!width && !height) {
          width = Math.round(viewBoxWidth)
          height = Math.round(viewBoxHeight)
        }
      }
    }
  }

  return {
    width: width || 300,
    height: height || 150,
  }
}

const bytesToBase64 = (bytes: Uint8Array): string => {
  const runtimeBuffer = getRuntimeBuffer()
  if (runtimeBuffer) {
    return runtimeBuffer.from(bytes).toString('base64')
  }

  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }

  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(binary)
  }

  throw new Error('No base64 encoder is available in this runtime')
}

const loadSharp = async (): Promise<any> => {
  try {
    const sharpModule = await import('sharp')
    return sharpModule.default || sharpModule
  } catch {
    throw new Error('Sharp is not installed. Install it with: npm install sharp')
  }
}

/**
 * Converts SVG input to PNG using sharp.
 */
export const convertSVGtoPNG = async (
  svgInput: Buffer | Uint8Array | string,
  options: SVGConvertOptions = {}
): Promise<Buffer> => {
  try {
    const runtimeBuffer = getRuntimeBuffer()
    if (!runtimeBuffer) {
      throw new Error('Buffer API is unavailable in this runtime')
    }

    let svgBuffer: Buffer
    if (typeof svgInput === 'string') {
      if (/^[A-Za-z0-9+/=]+$/.test(svgInput)) {
        svgBuffer = runtimeBuffer.from(svgInput, 'base64')
      } else {
        svgBuffer = runtimeBuffer.from(svgInput, 'utf-8')
      }
    } else if (runtimeBuffer.isBuffer(svgInput)) {
      svgBuffer = svgInput as Buffer
    } else if (svgInput instanceof Uint8Array) {
      svgBuffer = runtimeBuffer.from(svgInput)
    } else {
      throw new Error('Invalid SVG input type')
    }

    const sharp = await loadSharp()
    const { density = 72, width, height } = options

    let sharpInstance = sharp(svgBuffer, { density })

    if (width || height) {
      sharpInstance = sharpInstance.resize(width, height, {
        fit: 'contain',
        background: { alpha: 0, b: 255, g: 255, r: 255 },
      })
    }

    return sharpInstance.png().toBuffer()
  } catch (error) {
    throw new Error(`Failed to convert SVG to PNG: ${(error as Error).message}`)
  }
}

/**
 * Downloads an image URL and returns base64 content.
 */
export const downloadImageToBase64 = async (
  url: string,
  timeout = 5000,
  maxSize = 10 * 1024 * 1024
): Promise<string> => {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout,
      maxContentLength: maxSize,
      maxBodyLength: maxSize,
      validateStatus: (status) => status === 200,
    })

    if (!response.data || response.data.length === 0) {
      throw new Error('Empty response data received')
    }

    const base64 = bytesToBase64(new Uint8Array(response.data))
    if (!base64 || base64.length === 0) {
      throw new Error('Failed to convert response to base64')
    }

    return base64
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      throw new Error(`Request timeout after ${timeout}ms`)
    }
    if (error.response) {
      throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`)
    }
    if (error.request) {
      throw new Error(`Network error: ${error.message}`)
    }
    throw error
  }
}

export { downloadAndCacheImage, imageToBase64, parseDataUrl, guessMimeTypeFromBytes }

export default imageToBase64
