import type { TrackingDocumentInstance } from '../tracking'
import type { VNodeProperties } from '../helpers/xml-builder'

// Types for DocxDocumentInstance
export type MediaFileResponse = {
  fileContent: string
  fileNameWithExtension: string
  id: number
  isSVG?: boolean
}

export type ImageProcessingOptions = {
  downloadTimeout?: number
  maxImageSize?: number
  maxRetries?: number
  retryDelayBase?: number
  verboseLogging?: boolean
}

export type DocxDocumentInstance = Partial<TrackingDocumentInstance> & {
  availableDocumentSpace: number
  createDocumentRelationships: (
    filename: string,
    type: string,
    target: string,
    targetMode?: string
  ) => number
  createFont: (fontFamily: string) => string
  createMediaFile: (base64Uri: string) => Promise<MediaFileResponse>
  createNumbering: (type: 'ol' | 'ul', properties?: VNodeProperties) => number
  htmlString: string | null
  imageProcessing?: ImageProcessingOptions
  _imageCache?: Map<string, string | null>
  _retryStats?: {
    finalFailures: number
    successAfterRetry: number
    totalAttempts: number
  }
  relationshipFilename: string
  tableRowCantSplit: boolean
  zip: {
    folder: (name: string) => {
      file: (
        name: string,
        content: Uint8Array,
        options?: { createFolders: boolean }
      ) => void
      folder: (name: string) => {
        file: (
          name: string,
          content: Uint8Array,
          options?: { createFolders: boolean }
        ) => void
      }
    }
  }
}
