/* eslint-disable no-restricted-syntax, no-continue, import/extensions, prefer-destructuring */
/**
 * HTML to Virtual DOM Parser
 *
 * Converts HTML strings to virtual DOM trees using justjshtml for parsing.
 * This implementation replaces the unmaintained html-to-v package while
 * maintaining full API compatibility.
 *
 * Based on React's HTML DOM property configuration and HTML parser libraries.
 */

import { decode } from 'html-entities'
import { FragmentContext, JustHTML } from 'justjshtml/src/index.js'

import { VNode, VText } from '../vdom/index'

// ============================================================================
// Property Info System
// Configuration from the old virtual DOM library (originally from React's HTMLDOMPropertyConfig)
// This distinguishes HTML properties from attributes for correct VNode generation
// ============================================================================

// Property masks for attribute/property classification
/* eslint-disable no-bitwise */
const MUST_USE_ATTRIBUTE = 0x1
const MUST_USE_PROPERTY = 0x2
const HAS_BOOLEAN_VALUE = 0x4
const HAS_NUMERIC_VALUE = 0x8
const HAS_POSITIVE_NUMERIC_VALUE = 0x10 | 0x8
const HAS_OVERLOADED_BOOLEAN_VALUE = 0x20
/* eslint-enable no-bitwise */

type PropertyConfig = number | null

interface PropertyInfo {
  attributeName: string
  propertyName?: string
  mustUseAttribute: boolean
  mustUseProperty: boolean
  hasBooleanValue: boolean
  hasNumericValue: boolean
  hasPositiveNumericValue: boolean
  hasOverloadedBooleanValue: boolean
  isCustomAttribute?: boolean
}

type NodeAttributes = Record<string, string>

interface ParsedNode {
  name: string
  data?: string
  attrs?: NodeAttributes
  children?: ParsedNode[]
  [key: string]: string | NodeAttributes | ParsedNode[] | undefined
}

interface ParsedDocumentRoot {
  children?: ParsedNode[]
}

interface ParsedDocument {
  root?: ParsedDocumentRoot
}

type VNodePropertyValue = string | number | boolean | Record<string, string>

interface VNodeProperties {
  attributes: NodeAttributes
  [key: string]: NodeAttributes | VNodePropertyValue
}

const Properties: Record<string, PropertyConfig> = {
  accept: null,
  acceptCharset: null,
  accessKey: null,
  action: null,
  allowFullScreen: MUST_USE_ATTRIBUTE | HAS_BOOLEAN_VALUE,
  allowTransparency: MUST_USE_ATTRIBUTE,
  alt: null,
  async: HAS_BOOLEAN_VALUE,
  autoComplete: null,
  autoFocus: HAS_BOOLEAN_VALUE,
  autoPlay: HAS_BOOLEAN_VALUE,
  capture: MUST_USE_ATTRIBUTE | HAS_BOOLEAN_VALUE,
  cellPadding: null,
  cellSpacing: null,
  charSet: MUST_USE_ATTRIBUTE,
  challenge: MUST_USE_ATTRIBUTE,
  checked: MUST_USE_PROPERTY | HAS_BOOLEAN_VALUE,
  classID: MUST_USE_ATTRIBUTE,
  className: MUST_USE_ATTRIBUTE,
  cols: MUST_USE_ATTRIBUTE | HAS_POSITIVE_NUMERIC_VALUE,
  colSpan: null,
  content: null,
  contentEditable: null,
  contextMenu: MUST_USE_ATTRIBUTE,
  controls: MUST_USE_PROPERTY | HAS_BOOLEAN_VALUE,
  coords: null,
  crossOrigin: null,
  data: null,
  dateTime: MUST_USE_ATTRIBUTE,
  defer: HAS_BOOLEAN_VALUE,
  dir: null,
  disabled: MUST_USE_ATTRIBUTE | HAS_BOOLEAN_VALUE,
  download: HAS_OVERLOADED_BOOLEAN_VALUE,
  draggable: null,
  encType: null,
  form: MUST_USE_ATTRIBUTE,
  formAction: MUST_USE_ATTRIBUTE,
  formEncType: MUST_USE_ATTRIBUTE,
  formMethod: MUST_USE_ATTRIBUTE,
  formNoValidate: HAS_BOOLEAN_VALUE,
  formTarget: MUST_USE_ATTRIBUTE,
  frameBorder: MUST_USE_ATTRIBUTE,
  headers: null,
  height: MUST_USE_ATTRIBUTE,
  hidden: MUST_USE_ATTRIBUTE | HAS_BOOLEAN_VALUE,
  high: null,
  href: null,
  hrefLang: null,
  htmlFor: null,
  httpEquiv: null,
  icon: null,
  id: MUST_USE_PROPERTY,
  is: MUST_USE_ATTRIBUTE,
  keyParams: MUST_USE_ATTRIBUTE,
  keyType: MUST_USE_ATTRIBUTE,
  label: null,
  lang: null,
  list: MUST_USE_ATTRIBUTE,
  loop: MUST_USE_PROPERTY | HAS_BOOLEAN_VALUE,
  low: null,
  manifest: MUST_USE_ATTRIBUTE,
  marginHeight: null,
  marginWidth: null,
  max: null,
  maxLength: MUST_USE_ATTRIBUTE,
  media: MUST_USE_ATTRIBUTE,
  mediaGroup: null,
  method: null,
  min: null,
  minLength: MUST_USE_ATTRIBUTE,
  multiple: MUST_USE_PROPERTY | HAS_BOOLEAN_VALUE,
  muted: MUST_USE_PROPERTY | HAS_BOOLEAN_VALUE,
  name: null,
  noValidate: HAS_BOOLEAN_VALUE,
  open: HAS_BOOLEAN_VALUE,
  optimum: null,
  pattern: null,
  placeholder: null,
  poster: null,
  preload: null,
  radioGroup: null,
  readOnly: MUST_USE_PROPERTY | HAS_BOOLEAN_VALUE,
  rel: null,
  required: HAS_BOOLEAN_VALUE,
  role: MUST_USE_ATTRIBUTE,
  rows: MUST_USE_ATTRIBUTE | HAS_POSITIVE_NUMERIC_VALUE,
  rowSpan: null,
  sandbox: null,
  scope: null,
  scoped: HAS_BOOLEAN_VALUE,
  scrolling: null,
  seamless: MUST_USE_ATTRIBUTE | HAS_BOOLEAN_VALUE,
  selected: MUST_USE_PROPERTY | HAS_BOOLEAN_VALUE,
  shape: null,
  size: MUST_USE_ATTRIBUTE | HAS_POSITIVE_NUMERIC_VALUE,
  sizes: MUST_USE_ATTRIBUTE,
  span: HAS_POSITIVE_NUMERIC_VALUE,
  spellCheck: null,
  src: null,
  srcDoc: MUST_USE_PROPERTY,
  srcSet: MUST_USE_ATTRIBUTE,
  start: HAS_NUMERIC_VALUE,
  step: null,
  style: null,
  tabIndex: null,
  target: null,
  title: null,
  type: null,
  useMap: null,
  value: MUST_USE_PROPERTY,
  width: MUST_USE_ATTRIBUTE,
  wmode: MUST_USE_ATTRIBUTE,
  autoCapitalize: null,
  autoCorrect: null,
  itemProp: MUST_USE_ATTRIBUTE,
  itemScope: MUST_USE_ATTRIBUTE | HAS_BOOLEAN_VALUE,
  itemType: MUST_USE_ATTRIBUTE,
  itemID: MUST_USE_ATTRIBUTE,
  itemRef: MUST_USE_ATTRIBUTE,
  property: null,
  unselectable: MUST_USE_ATTRIBUTE,
}
/* eslint-enable no-bitwise */

const PropertyToAttributeMapping: Partial<Record<keyof typeof Properties, string>> = {
  className: 'class',
  htmlFor: 'for',
  httpEquiv: 'http-equiv',
  acceptCharset: 'accept-charset',
}

function checkMask(value: number, bitmask: number): boolean {
  // eslint-disable-next-line no-bitwise
  return (value & bitmask) === bitmask
}

// Build property info lookup table
const propInfoByAttributeName: Record<string, PropertyInfo> = {}
Object.keys(Properties).forEach((propName) => {
  const propConfig = Properties[propName] || 0
  const attributeName = PropertyToAttributeMapping[propName] || propName.toLowerCase()

  const propertyInfo: PropertyInfo = {
    attributeName,
    propertyName: propName,
    mustUseAttribute: checkMask(propConfig, MUST_USE_ATTRIBUTE),
    mustUseProperty: checkMask(propConfig, MUST_USE_PROPERTY),
    hasBooleanValue: checkMask(propConfig, HAS_BOOLEAN_VALUE),
    hasNumericValue: checkMask(propConfig, HAS_NUMERIC_VALUE),
    hasPositiveNumericValue: checkMask(propConfig, HAS_POSITIVE_NUMERIC_VALUE),
    hasOverloadedBooleanValue: checkMask(propConfig, HAS_OVERLOADED_BOOLEAN_VALUE),
  }

  propInfoByAttributeName[attributeName] = propertyInfo
})

function getPropertyInfo(attributeName: string): PropertyInfo {
  const lowerCased = attributeName.toLowerCase()

  if (Object.hasOwn(propInfoByAttributeName, lowerCased)) {
    return propInfoByAttributeName[lowerCased]
  }

  // Custom attribute
  return {
    attributeName,
    mustUseAttribute: true,
    isCustomAttribute: true,
  }
}

/**
 * Parse CSS style string into object
 */
function parseStyles(input: string): Record<string, string> {
  const attributes = input.split(';')
  const styles = attributes.reduce<Record<string, string>>((object, attribute) => {
    const entry = attribute.split(/:(.*)/)
    if (entry[0] && entry[1]) {
      object[entry[0].trim()] = entry[1].trim()
    }
    return object
  }, {})
  return styles
}

const propertyValueConversions: Record<string, (value: string) => VNodePropertyValue> = {
  style: parseStyles,
  placeholder: decode,
  title: decode,
  alt: decode,
}

function propertyIsTrue(
  propInfo: Pick<
    PropertyInfo,
    'hasBooleanValue' | 'hasOverloadedBooleanValue' | 'attributeName'
  >,
  value: VNodePropertyValue
): boolean {
  const propertyValue =
    typeof value === 'string'
      ? value
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value)

  if (propInfo.hasBooleanValue) {
    return propertyValue === '' || propertyValue.toLowerCase() === propInfo.attributeName
  }
  if (propInfo.hasOverloadedBooleanValue) {
    return propertyValue === ''
  }
  return false
}

function getPropertyValue(
  propInfo: PropertyInfo,
  value: VNodePropertyValue
): VNodePropertyValue {
  const isTrue = propertyIsTrue(propInfo, value)
  if (propInfo.hasBooleanValue) {
    return !!isTrue
  }
  if (propInfo.hasOverloadedBooleanValue) {
    return isTrue ? true : value
  }
  if (propInfo.hasNumericValue || propInfo.hasPositiveNumericValue) {
    return Number(value)
  }
  return value
}

function setVNodeProperty(
  properties: VNodeProperties,
  propInfo: PropertyInfo,
  value: VNodePropertyValue
): void {
  const propName = propInfo.propertyName
  let valueConverter: ((input: string) => VNodePropertyValue) | undefined

  if (!propName) {
    return
  }

  if (Object.hasOwn(propertyValueConversions, propName)) {
    valueConverter = propertyValueConversions[propName]
    value = valueConverter(
      typeof value === 'string'
        ? value
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value)
    )
  }

  properties[propInfo.propertyName] = getPropertyValue(propInfo, value)
}

function getAttributeValue(propInfo: PropertyInfo, value: string): string {
  if (propInfo.hasBooleanValue) {
    return ''
  }
  return value
}

function setVNodeAttribute(
  properties: VNodeProperties,
  propInfo: PropertyInfo,
  value: string
): void {
  properties.attributes[propInfo.attributeName] = getAttributeValue(propInfo, value)
}

function getPropertySetter(propInfo: PropertyInfo): {
  set: typeof setVNodeAttribute | typeof setVNodeProperty
} {
  if (propInfo.mustUseAttribute) {
    return { set: setVNodeAttribute }
  }
  return { set: setVNodeProperty }
}

/**
 * Convert tag attributes to VNode properties
 */

function convertTagAttributes(tag: ParsedNode): VNodeProperties {
  const attributes = tag.attrs || {}
  const vNodeProperties = {
    attributes: {},
  }

  Object.keys(attributes).forEach((attributeName) => {
    const value = attributes[attributeName]
    const propInfo = getPropertyInfo(attributeName)
    const propertySetter = getPropertySetter(propInfo)
    propertySetter.set(vNodeProperties, propInfo, value)
  })

  return vNodeProperties
}

// ============================================================================
// HTML Parser to VDOM Converter
// ============================================================================

type VNodeLike = VNode | VText
type ConverterGetVNodeKey = (props: NodeAttributes) => string | number | null | undefined
type ConvertHTMLOptions = {
  getVNodeKey?: ConverterGetVNodeKey
}

function createConverter(VNodeClass: typeof VNode, VTextClass: typeof VText) {
  const isElementNode = (node: ParsedNode) =>
    !node.name.startsWith('#') && node.name !== '!doctype'

  const converter = {
    convert(node: ParsedNode, getVNodeKey?: ConverterGetVNodeKey): VNodeLike {
      if (isElementNode(node)) {
        return converter.convertTag(node, getVNodeKey)
      }
      if (node.name === '#text') {
        return new VTextClass(decode(node.data || ''))
      }
      // Converting an unsupported node, return an empty text node instead
      return new VTextClass('')
    },

    convertTag(tag: ParsedNode, getVNodeKey?: ConverterGetVNodeKey): VNodeLike {
      const attributes = convertTagAttributes(tag)
      let key: string | number | null | undefined

      if (getVNodeKey) {
        key = getVNodeKey(attributes)
      }

      const children = (tag.children || []).map((node) =>
        converter.convert(node, getVNodeKey)
      )

      return new VNodeClass(tag.name, attributes, children, key)
    },
  }
  return converter
}

const HTML_TAG_PATTERN = /<\s*html\b/i
const HEAD_TAG_PATTERN = /<\s*head\b/i
const BODY_TAG_PATTERN = /<\s*body\b/i
const DOCTYPE_PATTERN = /<\s*!doctype\b/i
const TBODY_PATTERN = /<\s*tbody\b/i
const LEADING_TRIVIA_PATTERN = /^\s*(?:<!--[\s\S]*?-->\s*)*/

function getFragmentContextTagName(html: string): string {
  const trimmed = html.replace(LEADING_TRIVIA_PATTERN, '')

  if (/^<(?:td|th)\b/i.test(trimmed)) {
    return 'tr'
  }
  if (/^<tr\b/i.test(trimmed)) {
    return 'tbody'
  }
  if (/^<(?:tbody|thead|tfoot|caption|colgroup)\b/i.test(trimmed)) {
    return 'table'
  }
  if (/^<col\b/i.test(trimmed)) {
    return 'colgroup'
  }

  return 'body'
}

function normalizeDocumentRootNodes(
  rootChildren: ParsedNode[],
  hasExplicitHead: boolean,
  hasExplicitBody: boolean
): ParsedNode[] {
  const normalizedNodes: ParsedNode[] = []

  rootChildren.forEach((rootNode) => {
    if (rootNode.name !== 'html') {
      normalizedNodes.push(rootNode)
      return
    }

    const htmlChildren = rootNode.children || []
    const headNode = htmlChildren.find((child) => child.name === 'head')
    const bodyNode = htmlChildren.find((child) => child.name === 'body')

    if (hasExplicitHead && headNode) {
      normalizedNodes.push(headNode)
    }
    if (hasExplicitBody && bodyNode) {
      normalizedNodes.push(bodyNode)
    }

    if (!hasExplicitHead && !hasExplicitBody) {
      normalizedNodes.push(...(bodyNode?.children || []))
      return
    }

    if (hasExplicitHead && !hasExplicitBody) {
      normalizedNodes.push(...(bodyNode?.children || []))
    }
    if (hasExplicitBody && !hasExplicitHead) {
      normalizedNodes.push(...(headNode?.children || []))
    }
  })

  return normalizedNodes
}

function flattenImplicitTableBodies(nodes: ParsedNode[], shouldFlatten: boolean): void {
  if (!shouldFlatten) {
    return
  }

  nodes.forEach((node) => {
    const children = node.children || []
    flattenImplicitTableBodies(children, shouldFlatten)

    if (node.name !== 'table' || children.length === 0) {
      return
    }

    const elementChildren = children.filter((child) => !child.name.startsWith('#'))
    if (
      elementChildren.length > 0 &&
      elementChildren.every((child) => child.name === 'tbody')
    ) {
      node.children = children.flatMap((child) =>
        child.name === 'tbody' ? child.children || [] : [child]
      )
    }
  })
}

function getRootChildren(document: JustHTML): ParsedNode[] {
  const parsedDocument = document as ParsedDocument
  return parsedDocument.root?.children || []
}

/**
 * Parse HTML string into DOM nodes.
 *
 * justjshtml always parses as a full HTML document, while the previous
 * htmlparser2 integration behaved like fragment parsing for most inputs.
 * We normalize root nodes to preserve previous behavior expected by tests:
 * - fragments resolve to body children
 * - explicit <html> preserves the html root element
 * - explicit <head>/<body> keeps those roots
 */
function parseHTML(html: string): ParsedNode[] {
  const hasExplicitHtml = HTML_TAG_PATTERN.test(html)
  const hasExplicitHead = HEAD_TAG_PATTERN.test(html)
  const hasExplicitBody = BODY_TAG_PATTERN.test(html)
  const hasDoctype = DOCTYPE_PATTERN.test(html)
  let parsedNodes: ParsedNode[]

  if (hasExplicitHtml || hasExplicitHead || hasExplicitBody || hasDoctype) {
    const doc = new JustHTML(html)
    const rootChildren = getRootChildren(doc)
    parsedNodes = hasExplicitHtml
      ? rootChildren
      : normalizeDocumentRootNodes(rootChildren, hasExplicitHead, hasExplicitBody)
  } else {
    const fragmentContextTagName = getFragmentContextTagName(html)
    const doc = new JustHTML(html, {
      fragmentContext: new FragmentContext(fragmentContextTagName),
    })
    parsedNodes = getRootChildren(doc)
  }

  flattenImplicitTableBodies(parsedNodes, !TBODY_PATTERN.test(html))
  return parsedNodes
}

/**
 * Main converter function
 */
function convertHTML(html: string): VNode[] | VNode | VText
function convertHTML(options: ConvertHTMLOptions, html: string): VNode[] | VNode | VText
function convertHTML(optionsOrHTML: string | ConvertHTMLOptions, html?: string) {
  const shouldUseOptions = typeof optionsOrHTML === 'object'
  const opts = shouldUseOptions ? optionsOrHTML : undefined
  const htmlString = (typeof optionsOrHTML === 'string' ? optionsOrHTML : html) || ''

  const converter = createConverter(VNode, VText)
  const tags = parseHTML(htmlString)

  let convertedHTML
  if (tags.length === 0) {
    // Empty HTML
    convertedHTML = new VText('')
  } else if (tags.length > 1) {
    convertedHTML = tags.map((tag) => converter.convert(tag, opts && opts.getVNodeKey))
  } else {
    convertedHTML = converter.convert(tags[0], opts && opts.getVNodeKey)
  }

  return convertedHTML
}

/**
 * Factory function for HTML to VNode conversion
 */
export default function createHTMLtoVDOM() {
  return convertHTML
}
