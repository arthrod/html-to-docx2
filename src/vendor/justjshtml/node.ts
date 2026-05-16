import { toHTML } from './serialize.js'
import { query } from './selector.js'
import { toMarkdown } from './markdown.js'

type NodeOptions = {
  attrs?: Record<string, string> | null
  data?: string | null
  namespace?: string | null
}

export class Node {
  attrs: any
  children: any
  data: any
  name: any
  namespace: string | null
  parent: any
  templateContent: any
  template_content: any
  constructor(name: any, options: NodeOptions = {}) {
    const { attrs = null, data = null, namespace = null } = options
    this.name = name
    this.namespace =
      name.startsWith('#') || name === '!doctype'
        ? (namespace ?? null)
        : namespace || 'html'
    this.parent = null
    this.data = data
    this.attrs = attrs ?? {}
    this.children = []

    this.templateContent = null
    if (name === 'template' && (this.namespace == null || this.namespace === 'html')) {
      this.templateContent = new Node('#document-fragment', { namespace: null })
    }
    this.template_content = this.templateContent
  }

  appendChild(node: any) {
    this.children.push(node)
    node.parent = this
  }

  append_child(node: any) {
    this.appendChild(node)
  }

  removeChild(node: any) {
    const idx = this.children.indexOf(node)
    if (idx === -1) throw new Error('Node is not a child of this node')
    this.children.splice(idx, 1)
    node.parent = null
  }

  remove_child(node: any) {
    this.removeChild(node)
  }

  insertBefore(node: any, referenceNode: any) {
    if (referenceNode == null) {
      this.appendChild(node)
      return
    }
    const idx = this.children.indexOf(referenceNode)
    if (idx === -1) throw new Error('Reference node is not a child of this node')
    this.children.splice(idx, 0, node)
    node.parent = this
  }

  insert_before(node: any, referenceNode: any) {
    this.insertBefore(node, referenceNode)
  }

  replaceChild(newNode: any, oldNode: any) {
    const idx = this.children.indexOf(oldNode)
    if (idx === -1) throw new Error('Old node is not a child of this node')
    this.children[idx] = newNode
    oldNode.parent = null
    newNode.parent = this
    return oldNode
  }

  replace_child(newNode: any, oldNode: any) {
    return this.replaceChild(newNode, oldNode)
  }

  hasChildNodes() {
    return this.children.length > 0
  }

  has_child_nodes() {
    return this.hasChildNodes()
  }

  get text() {
    if (this.name === '#text') return this.data || ''
    return ''
  }

  toText({ separator = ' ', strip = true } = {}) {
    const parts: any = []

    const walk = (node: any) => {
      if (node.name === '#text') {
        let data = node.data ?? ''
        if (strip) data = data.trim()
        if (data) parts.push(data)
        return
      }
      for (const child of node.children) walk(child)
      if (node.templateContent) walk(node.templateContent)
    }

    walk(this)
    return parts.join(separator)
  }

  to_text(options: any) {
    return this.toText(options)
  }

  toHTML(options: any) {
    return toHTML(this, options)
  }

  to_html(indent = 0, indentSize = 2, pretty = true) {
    return this.toHTML({ indent, indentSize, pretty })
  }

  query(selector: string) {
    return query(this, selector)
  }

  toMarkdown() {
    return toMarkdown(this)
  }

  to_markdown() {
    return this.toMarkdown()
  }

  cloneNode(deep = false) {
    const clone = new Node(this.name, {
      attrs: this.attrs ? { ...this.attrs } : {},
      data: this.data,
      namespace: this.namespace,
    })
    if (this.templateContent) {
      clone.templateContent = this.templateContent.cloneNode(deep)
      clone.template_content = clone.templateContent
    }
    if (deep) {
      for (const child of this.children) clone.appendChild(child.cloneNode(true))
    }
    return clone
  }

  clone_node(deep = false) {
    return this.cloneNode(deep)
  }
}
