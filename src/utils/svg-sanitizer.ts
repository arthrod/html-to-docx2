/**
 * SVG Sanitizer - security-focused whitelist sanitizer for inline SVG content.
 */

const ALLOWED_ELEMENTS = new Set([
  'svg',
  'g',
  'defs',
  'symbol',
  'marker',
  'clipPath',
  'mask',
  'pattern',
  'circle',
  'ellipse',
  'line',
  'path',
  'polygon',
  'polyline',
  'rect',
  'text',
  'tspan',
  'textPath',
  'linearGradient',
  'radialGradient',
  'stop',
  'filter',
  'feBlend',
  'feColorMatrix',
  'feComponentTransfer',
  'feComposite',
  'feConvolveMatrix',
  'feDiffuseLighting',
  'feDisplacementMap',
  'feDistantLight',
  'feDropShadow',
  'feFlood',
  'feFuncA',
  'feFuncB',
  'feFuncG',
  'feFuncR',
  'feGaussianBlur',
  'feImage',
  'feMerge',
  'feMergeNode',
  'feMorphology',
  'feOffset',
  'fePointLight',
  'feSpecularLighting',
  'feSpotLight',
  'feTile',
  'feTurbulence',
  'image',
  'use',
  'title',
  'desc',
  'metadata',
  'switch',
  'a',
])

const ALLOWED_ATTRIBUTES = new Set([
  'xmlns',
  'xmlns:xlink',
  'id',
  'class',
  'style',
  'tabindex',
  'width',
  'height',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'dx',
  'dy',
  'viewBox',
  'preserveAspectRatio',
  'd',
  'points',
  'pathLength',
  'transform',
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-dasharray',
  'stroke-dashoffset',
  'opacity',
  'visibility',
  'display',
  'overflow',
  'clip-path',
  'clip-rule',
  'mask',
  'filter',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'font-variant',
  'font-stretch',
  'text-anchor',
  'text-decoration',
  'text-rendering',
  'letter-spacing',
  'word-spacing',
  'writing-mode',
  'direction',
  'dominant-baseline',
  'alignment-baseline',
  'baseline-shift',
  'gradientUnits',
  'gradientTransform',
  'spreadMethod',
  'offset',
  'stop-color',
  'stop-opacity',
  'in',
  'in2',
  'result',
  'type',
  'values',
  'mode',
  'stdDeviation',
  'edgeMode',
  'kernelMatrix',
  'divisor',
  'bias',
  'targetX',
  'targetY',
  'surfaceScale',
  'specularConstant',
  'specularExponent',
  'diffuseConstant',
  'scale',
  'xChannelSelector',
  'yChannelSelector',
  'k1',
  'k2',
  'k3',
  'k4',
  'operator',
  'radius',
  'baseFrequency',
  'numOctaves',
  'seed',
  'stitchTiles',
  'order',
  'kernelUnitLength',
  'pointsAtX',
  'pointsAtY',
  'pointsAtZ',
  'limitingConeAngle',
  'z',
  'azimuth',
  'elevation',
  'href',
  'xlink:href',
  'target',
  'markerWidth',
  'markerHeight',
  'refX',
  'refY',
  'orient',
  'markerUnits',
  'patternUnits',
  'patternContentUnits',
  'patternTransform',
  'clipPathUnits',
  'maskUnits',
  'maskContentUnits',
])

const DISALLOWED_ELEMENTS = new Set([
  'script',
  'foreignObject',
  'iframe',
  'embed',
  'object',
  'applet',
  'frame',
  'frameset',
])

const DANGEROUS_ATTRIBUTES = /^on[a-z]/i
const DANGEROUS_PROTOCOLS = /^\s*(javascript|vbscript|file|about):/i
const SAFE_DATA_URLS = /^\s*data:image\/(png|jpeg|gif|webp|bmp);base64,/i
const URL_REGEX = /url\(\s*(['"]?)(.*?)\1\s*\)/gi
const URL_ATTRIBUTES = new Set([
  'href',
  'xlink:href',
  'fill',
  'stroke',
  'filter',
  'clip-path',
  'mask',
  'style',
])

type SVGSanitizerOptions = {
  enabled?: boolean
  verboseLogging?: boolean
}

type SVGValidationResult = {
  valid: boolean
  warnings: string[]
}

type SVGAttributeValue = boolean | number | string
type SVGAttributes = Record<string, SVGAttributeValue>

type SVGVNodeProperties = {
  attributes?: SVGAttributes
  [key: string]: SVGAttributeValue | SVGAttributes | undefined
}

type SVGTextNode = {
  text: string
}

type SVGChildNode = SVGVNode | SVGTextNode | string

type SVGVNode = {
  children?: SVGChildNode[]
  properties?: SVGVNodeProperties
  tagName?: string
  [key: string]: SVGAttributeValue | SVGVNodeProperties | SVGChildNode[] | undefined
}

const isSVGTextNode = (node: SVGChildNode | null): node is SVGTextNode =>
  typeof node === 'object' && node !== null && 'text' in node

const isSVGVNode = (node: SVGChildNode): node is SVGVNode =>
  typeof node === 'object' && node !== null && !isSVGTextNode(node)

const hasDangerousProtocol = (value: SVGAttributeValue | null | undefined): boolean => {
  if (typeof value !== 'string' || value.length === 0) {
    return false
  }

  const trimmedValue = value.trim()
  if (
    trimmedValue.startsWith('#') ||
    trimmedValue.startsWith('http://') ||
    trimmedValue.startsWith('https://')
  ) {
    return false
  }

  if (trimmedValue.toLowerCase().startsWith('data:')) {
    return !SAFE_DATA_URLS.test(trimmedValue)
  }

  let isDangerous = DANGEROUS_PROTOCOLS.test(trimmedValue)

  if (!isDangerous) {
    let match
    URL_REGEX.lastIndex = 0
    while ((match = URL_REGEX.exec(trimmedValue)) !== null) {
      const innerUrl = match[2]
      if (
        !innerUrl.trim().startsWith('#') &&
        !innerUrl.trim().startsWith('http://') &&
        !innerUrl.trim().startsWith('https://')
      ) {
        if (innerUrl.trim().toLowerCase().startsWith('data:')) {
          if (!SAFE_DATA_URLS.test(innerUrl.trim())) {
            isDangerous = true
            break
          }
        } else if (DANGEROUS_PROTOCOLS.test(innerUrl.trim())) {
          isDangerous = true
          break
        }
      }
    }
  }

  return isDangerous
}

export const sanitizeSVGVNode = (
  vNode: SVGVNode,
  options: SVGSanitizerOptions = {}
): SVGVNode | null => {
  const { verboseLogging = false, enabled = true } = options

  if (!enabled) {
    return vNode
  }

  if (!vNode || !vNode.tagName) {
    return null
  }

  const { tagName } = vNode
  const lowerTagName = tagName.toLowerCase()

  if (DISALLOWED_ELEMENTS.has(lowerTagName)) {
    if (verboseLogging) {
      // eslint-disable-next-line no-console
      console.warn(`[SVG SANITIZER] Blocked dangerous element: <${tagName}>`)
    }
    return null
  }

  if (!ALLOWED_ELEMENTS.has(tagName) && !ALLOWED_ELEMENTS.has(lowerTagName)) {
    if (verboseLogging) {
      // eslint-disable-next-line no-console
      console.warn(`[SVG SANITIZER] Removed non-whitelisted element: <${tagName}>`)
    }
    return null
  }

  const sanitizedVNode: SVGVNode = {
    ...vNode,
    children: vNode.children ? [...vNode.children] : [],
    properties: vNode.properties ? { ...vNode.properties } : {},
  }

  if (vNode.properties) {
    const attributes = vNode.properties.attributes || {}
    const sanitizedAttributes: SVGAttributes = {}
    let removedCount = 0

    Object.entries(attributes).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase()

      if (DANGEROUS_ATTRIBUTES.test(lowerKey)) {
        if (verboseLogging) {
          // eslint-disable-next-line no-console
          console.warn(`[SVG SANITIZER] Removed event handler: ${key}="${value}"`)
        }
        removedCount += 1
        return
      }

      if (URL_ATTRIBUTES.has(lowerKey) && hasDangerousProtocol(value)) {
        if (verboseLogging) {
          // eslint-disable-next-line no-console
          console.warn(`[SVG SANITIZER] Blocked dangerous protocol in ${key}: ${value}`)
        }
        removedCount += 1
        return
      }

      if (
        ALLOWED_ATTRIBUTES.has(lowerKey) ||
        lowerKey.startsWith('data-') ||
        lowerKey.startsWith('aria-')
      ) {
        sanitizedAttributes[key] = value
      } else {
        if (verboseLogging) {
          // eslint-disable-next-line no-console
          console.warn(
            `[SVG SANITIZER] Removed non-whitelisted attribute: ${key}="${value}"`
          )
        }
        removedCount += 1
      }
    })

    sanitizedVNode.properties = {
      ...sanitizedVNode.properties,
      attributes: sanitizedAttributes,
    }

    if (removedCount > 0 && verboseLogging) {
      // eslint-disable-next-line no-console
      console.log(
        `[SVG SANITIZER] Removed ${removedCount} unsafe attribute(s) from <${tagName}>`
      )
    }
  }

  if (vNode.children && vNode.children.length > 0) {
    const sanitizedChildren = vNode.children
      .map((child) => {
        if (typeof child === 'string' || isSVGTextNode(child)) {
          return child
        }
        if (isSVGVNode(child)) {
          return sanitizeSVGVNode(child, options)
        }
        return null
      })
      .filter((child): child is SVGChildNode => child !== null)

    sanitizedVNode.children = sanitizedChildren

    if (sanitizedChildren.length < vNode.children.length && verboseLogging) {
      const removed = vNode.children.length - sanitizedChildren.length
      // eslint-disable-next-line no-console
      console.log(`[SVG SANITIZER] Removed ${removed} child element(s) from <${tagName}>`)
    }
  }

  return sanitizedVNode
}

export const validateSVGString = (svgString: string): SVGValidationResult => {
  const warnings: string[] = []

  if (!svgString || typeof svgString !== 'string') {
    return { valid: false, warnings: ['Invalid or empty SVG string'] }
  }

  if (/<script[\s>]/i.test(svgString)) {
    warnings.push('Contains <script> tag')
  }

  if (/\son[a-z]+\s*=/i.test(svgString)) {
    warnings.push('Contains event handler attributes (onclick, onload, etc.)')
  }

  if (/javascript:/i.test(svgString)) {
    warnings.push('Contains javascript: protocol')
  }

  if (/<foreignObject[\s>]/i.test(svgString)) {
    warnings.push('Contains <foreignObject> element')
  }

  if (/data:text\/html/i.test(svgString)) {
    warnings.push('Contains data:text/html URI (potential XSS vector)')
  }

  return {
    valid: warnings.length === 0,
    warnings,
  }
}

export { ALLOWED_ATTRIBUTES, ALLOWED_ELEMENTS, DISALLOWED_ELEMENTS }

export default {
  ALLOWED_ATTRIBUTES,
  ALLOWED_ELEMENTS,
  DISALLOWED_ELEMENTS,
  sanitizeSVGVNode,
  validateSVGString,
}
