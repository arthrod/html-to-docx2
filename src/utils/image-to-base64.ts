import { defaultDocumentOptions } from '../constants'

type DownloadOptions = {
  maxSize?: number
  timeout?: number
}

type RetryStats = {
  finalFailures: number
  successAfterRetry: number
  totalAttempts: number
}

type CacheAwareDocument = {
  _imageCache?: Map<string, string | null>
  _retryStats?: RetryStats
  imageProcessing?: {
    downloadTimeout?: number
    maxImageSize?: number
    maxRetries?: number
    retryDelayBase?: number
    verboseLogging?: boolean
  }
}

type LogArgument = boolean | number | string | null | undefined | { toString(): string }
type CaughtError =
  | Error
  | LogArgument
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

const toBase64 = (bytes: Uint8Array): string => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }

  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return globalThis.btoa(binary)
}

const logVerbose = (enabled: boolean, message: string, ...args: LogArgument[]): void => {
  if (enabled) {
    // eslint-disable-next-line no-console
    console.log(message, ...args)
  }
}

export const guessMimeTypeFromBytes = (bytes: Uint8Array): string => {
  if (bytes.length >= 4) {
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return 'image/jpeg'
    }

    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return 'image/png'
    }

    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
      return 'image/gif'
    }

    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes.length >= 12 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return 'image/webp'
    }

    if (bytes[0] === 0x42 && bytes[1] === 0x4d) {
      return 'image/bmp'
    }
  }

  const asText =
    typeof Buffer !== 'undefined'
      ? Buffer.from(bytes.subarray(0, 256)).toString('utf-8')
      : new TextDecoder().decode(bytes.subarray(0, 256))
  if (/^\s*<svg[\s>]/i.test(asText)) {
    return 'image/svg+xml'
  }

  return 'image/jpeg'
}

const downloadImage = async (
  imageUrl: string,
  { timeout = 5000, maxSize = 10 * 1024 * 1024 }: DownloadOptions = {}
): Promise<{ base64: string; mimeType: string }> => {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(String(imageUrl).trim(), 'http://dummy.base')
  } catch {
    throw new Error('Invalid URL provided')
  }

  const { protocol } = parsedUrl
  if (
    protocol !== 'http:' &&
    protocol !== 'https:' &&
    protocol !== 'data:' &&
    protocol !== 'blob:'
  ) {
    throw new Error(`Invalid URL protocol: ${protocol}`)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(imageUrl, { signal: controller.signal })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    if (!bytes.length) {
      throw new Error('Empty image response')
    }

    if (bytes.length > maxSize) {
      throw new Error(`Image exceeds max size (${bytes.length} > ${maxSize})`)
    }

    const contentTypeHeader = response.headers.get('content-type')?.split(';')[0]?.trim()
    const mimeType = contentTypeHeader || guessMimeTypeFromBytes(bytes)

    return {
      base64: toBase64(bytes),
      mimeType,
    }
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

/**
 * Convert an image URL to base64 string.
 * Kept for backward compatibility with existing callers.
 */
export async function imageToBase64(imageUrl: string): Promise<string> {
  // Validate URL
  const url = new URL(imageUrl)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Invalid URL provided')
  }

  const { base64 } = await downloadImage(imageUrl, {
    timeout: defaultDocumentOptions.imageProcessing.downloadTimeout,
    maxSize: defaultDocumentOptions.imageProcessing.maxImageSize,
  })
  return base64
}

export function parseDataUrl(dataUrl: string): { base64: string; mimeType: string } | null {
  const match = dataUrl.match(/^data:([A-Za-z-+./]+);base64,(.+)$/)
  if (!match || match.length !== 3) {
    return null
  }
  return {
    mimeType: match[1],
    base64: match[2],
  }
}

const sleep = async (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

export const downloadAndCacheImage = async (
  docxDocumentInstance: CacheAwareDocument,
  imageSource: string,
  options: Partial<CacheAwareDocument['imageProcessing']> = {}
): Promise<string | null> => {
  const maxRetries =
    options.maxRetries ??
    docxDocumentInstance.imageProcessing?.maxRetries ??
    defaultDocumentOptions.imageProcessing.maxRetries
  const verboseLogging =
    options.verboseLogging ??
    docxDocumentInstance.imageProcessing?.verboseLogging ??
    defaultDocumentOptions.imageProcessing.verboseLogging

  if (!docxDocumentInstance._imageCache) {
    docxDocumentInstance._imageCache = new Map()
  }

  if (!docxDocumentInstance._retryStats) {
    docxDocumentInstance._retryStats = {
      totalAttempts: 0,
      successAfterRetry: 0,
      finalFailures: 0,
    }
  }

  if (docxDocumentInstance._imageCache.has(imageSource)) {
    const cached = docxDocumentInstance._imageCache.get(imageSource)
    if (!cached || cached === 'FAILED') {
      logVerbose(
        verboseLogging,
        `[CACHE] Skipping previously failed image in this document: ${imageSource}`
      )
      return null
    }
    logVerbose(verboseLogging, `[CACHE] Using cached image data for: ${imageSource}`)
    return cached
  }

  let lastError: Error | null = null

  /* eslint-disable no-await-in-loop -- retry/backoff attempts must be sequential */
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    docxDocumentInstance._retryStats.totalAttempts += 1

    try {
      const timeoutMs =
        (options.downloadTimeout ??
          docxDocumentInstance.imageProcessing?.downloadTimeout ??
          defaultDocumentOptions.imageProcessing.downloadTimeout) * attempt
      const maxSize =
        options.maxImageSize ??
        docxDocumentInstance.imageProcessing?.maxImageSize ??
        defaultDocumentOptions.imageProcessing.maxImageSize

      logVerbose(
        verboseLogging,
        `[RETRY] Attempt ${attempt}/${maxRetries} for: ${imageSource}`
      )

      const { base64, mimeType } = await downloadImage(imageSource, {
        timeout: timeoutMs,
        maxSize,
      })

      if (mimeType === 'image/webp') {
        docxDocumentInstance._imageCache.set(imageSource, 'FAILED')
        return null
      }

      if (attempt > 1) {
        docxDocumentInstance._retryStats.successAfterRetry += 1
      }

      const dataUri = `data:${mimeType};base64,${base64}`
      docxDocumentInstance._imageCache.set(imageSource, dataUri)
      return dataUri
    } catch (error) {
      lastError = toError(error)
      if (attempt < maxRetries) {
        const delayMs =
          (options.retryDelayBase ??
            docxDocumentInstance.imageProcessing?.retryDelayBase ??
            defaultDocumentOptions.imageProcessing.retryDelayBase) * attempt
        await sleep(delayMs)
      }
    }
  }
  /* eslint-enable no-await-in-loop */

  docxDocumentInstance._retryStats.finalFailures += 1
  docxDocumentInstance._imageCache.set(imageSource, 'FAILED')
  if (lastError) {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] downloadAndCacheImage: ${lastError.message} for ${imageSource}`)
  }

  return null
}

export default imageToBase64
