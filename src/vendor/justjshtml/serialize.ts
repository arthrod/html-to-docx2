import { Doctype } from './tokens.js'
import { FOREIGN_ATTRIBUTE_ADJUSTMENTS, VOID_ELEMENTS } from './constants.js'

// Mirrors justhtml.serialize.to_test_format.

function qualifiedName(node: any) {
  const ns = node.namespace ?? null
  if (ns && ns !== 'html') return `${ns} ${node.name}`
  return node.name
}

function doctypeToTestFormat(node: any) {
  const doctype = node.data
  if (!(doctype instanceof Doctype)) return '| <!DOCTYPE >'

  const name = doctype.name || ''
  const publicId = doctype.publicId
  const systemId = doctype.systemId

  const parts = ['| <!DOCTYPE']
  if (name) parts.push(` ${name}`)
  else parts.push(' ')

  if (publicId != null || systemId != null) {
    const pub = publicId != null ? publicId : ''
    const sys = systemId != null ? systemId : ''
    parts.push(` "${pub}"`)
    parts.push(` "${sys}"`)
  }

  parts.push('>')
  return parts.join('')
}

function attrsToTestFormat(
  node: any,
  indent: any,
  { foreignAttributeAdjustments = null } = {}
) {
  const attrs = node.attrs || {}
  const keys = Object.keys(attrs)
  if (!keys.length) return []

  const padding = ' '.repeat(indent + 2)
  const namespace = node.namespace ?? null

  const displayAttrs = []
  for (const attrName of keys) {
    const value = attrs[attrName] ?? ''
    let displayName = attrName
    if (namespace && namespace !== 'html') {
      const lowerName = attrName.toLowerCase()
      if (foreignAttributeAdjustments && foreignAttributeAdjustments[lowerName]) {
        displayName = attrName.replaceAll(':', ' ')
      }
    }
    displayAttrs.push([displayName, String(value)])
  }

  // Match Python's default string sort (Unicode code point order), not locale collation.
  displayAttrs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  return displayAttrs.map(([name, value]) => `| ${padding}${name}="${value}"`)
}

function nodeToTestFormat(node: any, indent: any, options: any) {
  if (node.name === '#comment') {
    const comment = node.data || ''
    return `| ${' '.repeat(indent)}<!-- ${comment} -->`
  }

  if (node.name === '!doctype') return doctypeToTestFormat(node)

  if (node.name === '#text') {
    const text = node.data || ''
    return `| ${' '.repeat(indent)}"${text}"`
  }

  const line = `| ${' '.repeat(indent)}<${qualifiedName(node)}>`
  const attributeLines = attrsToTestFormat(node, indent, options)

  const templateContent = node.templateContent ?? node.template_content ?? null
  if (
    node.name === 'template' &&
    (node.namespace == null || node.namespace === 'html') &&
    templateContent
  ) {
    const sections = [line]
    if (attributeLines.length) sections.push(...attributeLines)
    sections.push(`| ${' '.repeat(indent + 2)}content`)
    for (const child of templateContent.children || [])
      sections.push(nodeToTestFormat(child, indent + 4, options))
    return sections.join('\n')
  }

  const sections = [line]
  if (attributeLines.length) sections.push(...attributeLines)
  for (const child of node.children || [])
    sections.push(nodeToTestFormat(child, indent + 2, options))
  return sections.join('\n')
}

interface ToTestFormatOptions {
  foreignAttributeAdjustments?: boolean
}

export function toTestFormat(node: any, options: ToTestFormatOptions = {}) {
  const { foreignAttributeAdjustments = FOREIGN_ATTRIBUTE_ADJUSTMENTS } = options
  const opts = { foreignAttributeAdjustments }

  if (node.name === '#document' || node.name === '#document-fragment') {
    return (node.children || [])
      .map((child: any) => nodeToTestFormat(child, 0, opts))
      .join('\n')
  }

  return nodeToTestFormat(node, 0, opts)
}

// Mirrors justhtml.serialize.to_html (used for the public API, not html5lib-tests).

function escapeText(text: any) {
  if (!text) return ''
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function chooseAttrQuote(value: any) {
  if (value == null) return '"'
  const s = String(value)
  if (s.includes('"') && !s.includes("'")) return "'"
  return '"'
}

function escapeAttrValue(value: any, quoteChar: any) {
  if (value == null) return ''
  let s = String(value).replaceAll('&', '&amp;')
  if (quoteChar === '"') return s.replaceAll('"', '&quot;')
  return s.replaceAll("'", '&#39;')
}

function canUnquoteAttrValue(value: any) {
  if (value == null) return false
  const s = String(value)
  for (const ch of s) {
    if (ch === '>') return false
    if (ch === '"' || ch === "'" || ch === '=') return false
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\f' || ch === '\r') return false
  }
  return true
}

function serializeStartTag(name: any, attrs: any) {
  const parts = ['<', name]
  if (attrs && Object.keys(attrs).length) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null || value === '') {
        parts.push(' ', key)
        continue
      }

      if (canUnquoteAttrValue(value)) {
        const escaped = String(value).replaceAll('&', '&amp;')
        parts.push(' ', key, '=', escaped)
        continue
      }

      const quote = chooseAttrQuote(value)
      const escaped = escapeAttrValue(value, quote)
      parts.push(' ', key, '=', quote, escaped, quote)
    }
  }
  parts.push('>')
  return parts.join('')
}

function serializeEndTag(name: any) {
  return `</${name}>`
}

function nodeToHTML(node: any, indent = 0, indentSize = 2, pretty = true): string {
  const prefix = pretty ? ' '.repeat(indent * indentSize) : ''
  const newline = pretty ? '\n' : ''
  const name = node.name

  if (name === '#text') {
    let text = node.data
    if (pretty) {
      text = text ? String(text).trim() : ''
      if (!text) return ''
      return `${prefix}${escapeText(text)}`
    }
    return text ? escapeText(text) : ''
  }

  if (name === '#comment') return `${prefix}<!--${node.data || ''}-->`

  if (name === '!doctype') return `${prefix}<!DOCTYPE html>`

  if (name === '#document-fragment') {
    const parts = []
    for (const child of node.children || []) {
      const childHTML = nodeToHTML(child, indent, indentSize, pretty)
      if (childHTML) parts.push(childHTML)
    }
    return pretty ? parts.join(newline) : parts.join('')
  }

  if (name === '#document') {
    const parts = []
    for (const child of node.children || [])
      parts.push(nodeToHTML(child, indent, indentSize, pretty))
    return pretty ? parts.join(newline) : parts.join('')
  }

  const attrs = node.attrs || {}
  const openTag = serializeStartTag(name, attrs)

  if (VOID_ELEMENTS.has(name)) return `${prefix}${openTag}`

  const templateContent = node.templateContent ?? node.template_content ?? null
  const children =
    name === 'template' &&
    (node.namespace == null || node.namespace === 'html') &&
    templateContent
      ? templateContent.children || []
      : node.children || []

  if (!children.length) return `${prefix}${openTag}${serializeEndTag(name)}`

  const allText = children.every((c: any) => c.name === '#text')
  if (allText && pretty) {
    return `${prefix}${openTag}${escapeText(node.toText({ separator: '', strip: false }))}${serializeEndTag(name)}`
  }

  const parts = [`${prefix}${openTag}`]
  for (const child of children) {
    const childHTML = nodeToHTML(child, indent + 1, indentSize, pretty)
    if (childHTML) parts.push(childHTML)
  }
  parts.push(`${prefix}${serializeEndTag(name)}`)
  return pretty ? parts.join(newline) : parts.join('')
}

export function toHTML(node: any, { indent = 0, indentSize = 2, pretty = true } = {}) {
  return nodeToHTML(node, indent, indentSize, pretty)
}
