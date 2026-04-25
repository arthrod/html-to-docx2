/* eslint-disable max-classes-per-file */
/**
 * Virtual DOM classes - EXACT implementation matching virtual-dom@2.x
 *
 * This is a faithful reproduction of virtual-dom's VNode and VText classes
 * to eliminate the security vulnerability (CVE-2025-57352) in virtual-dom's
 * transitive dependency min-document, while maintaining 100% API compatibility.
 *
 * Based on: https://github.com/Matt-Esch/virtual-dom
 */

const version = '2'
const noProperties: VNodeProperties = {}
const noChildren: VNodeChild[] = []

type VNodePropertyValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, string>

type VNodeProperties = Record<string, VNodePropertyValue>

type VNodeKey = string | number | null | undefined

type VHook = {
  hook?: () => void
  unhook?: () => void
}

type WidgetNode = {
  destroy?: () => void
  type: 'Widget'
}

type ThunkNode = {
  type: 'Thunk'
}

type VNodeChild = VNode | VText | WidgetNode | ThunkNode

/**
 * Helper to check if something is a VNode (internal)
 */
function _isVNode(x: VNodeChild | null | undefined): x is VNode {
  return typeof x === 'object' && x !== null && x.type === 'VirtualNode'
}

/**
 * Helper to check if something is a Widget
 */
function isWidget(x: VNodeChild | null | undefined): x is WidgetNode {
  return typeof x === 'object' && x !== null && x.type === 'Widget'
}

/**
 * Helper to check if something is a Thunk
 */
function isThunk(x: VNodeChild | null | undefined): x is ThunkNode {
  return typeof x === 'object' && x !== null && x.type === 'Thunk'
}

/**
 * Helper to check if something is a VHook
 */
function isVHook(x: VNodePropertyValue): x is VHook {
  return (
    typeof x === 'object' &&
    x !== null &&
    ((typeof x.hook === 'function' && !Object.hasOwn(x, 'hook')) ||
      (typeof x.unhook === 'function' && !Object.hasOwn(x, 'unhook')))
  )
}

/**
 * VNode - Represents an HTML element in the virtual DOM tree
 * EXACT copy of virtual-dom/vnode/vnode.js
 */
export class VNode {
  [key: string]:
    | string
    | number
    | boolean
    | null
    | undefined
    | VNodeProperties
    | VNodeChild[]
    | Record<string, VHook>
  tagName: string
  properties: VNodeProperties
  children: VNodeChild[]
  key?: string
  namespace: string | null
  count: number
  hasWidgets: boolean
  hasThunks: boolean
  hooks?: Record<string, VHook>
  descendantHooks: boolean

  constructor(
    tagName: string,
    properties?: VNodeProperties | null,
    children?: VNodeChild[],
    key?: VNodeKey,
    namespace?: string | null
  ) {
    const vnodeProperties = properties || noProperties
    const vnodeChildren = children || noChildren

    this.tagName = tagName
    this.properties = vnodeProperties
    this.children = vnodeChildren
    this.key = key !== null && key !== undefined ? String(key) : undefined
    this.namespace = typeof namespace === 'string' ? namespace : null

    const count = (vnodeChildren && vnodeChildren.length) || 0
    let descendants = 0
    let hasWidgets = false
    let hasThunks = false
    let descendantHooks = false
    let hooks

    // Check properties for hooks
    // eslint-disable-next-line no-restricted-syntax
    for (const propName in vnodeProperties) {
      if (Object.hasOwn(vnodeProperties, propName)) {
        const property = vnodeProperties[propName]
        if (isVHook(property) && property.unhook) {
          if (!hooks) {
            hooks = {}
          }
          hooks[propName] = property
        }
      }
    }

    // Calculate descendants and check for widgets/thunks
    for (let i = 0; i < count; i += 1) {
      const child = vnodeChildren[i]
      if (_isVNode(child)) {
        descendants += child.count || 0

        if (!hasWidgets && child.hasWidgets) {
          hasWidgets = true
        }

        if (!hasThunks && child.hasThunks) {
          hasThunks = true
        }

        if (!descendantHooks && (child.hooks || child.descendantHooks)) {
          descendantHooks = true
        }
      } else if (!hasWidgets && isWidget(child)) {
        if (typeof child.destroy === 'function') {
          hasWidgets = true
        }
      } else if (!hasThunks && isThunk(child)) {
        hasThunks = true
      }
    }

    this.count = count + descendants
    this.hasWidgets = hasWidgets
    this.hasThunks = hasThunks
    this.hooks = hooks
    this.descendantHooks = descendantHooks
  }
}

VNode.prototype.version = version
VNode.prototype.type = 'VirtualNode'

/**
 * VText - Represents a text node in the virtual DOM tree
 * EXACT copy of virtual-dom/vnode/vtext.js
 */
export class VText {
  [key: string]: string
  constructor(text: string | number | boolean | null | undefined) {
    this.text = String(text)
  }
  text: string
}

VText.prototype.version = version
VText.prototype.type = 'VirtualText'

/**
 * Check if a value is a VNode (exported for compatibility)
 */
export function isVNode(vnode: VNodeChild | null | undefined): vnode is VNode {
  return typeof vnode === 'object' && vnode !== null && vnode.type === 'VirtualNode'
}

/**
 * Check if a value is a VText (exported for compatibility)
 */
export function isVText(vtext: VNodeChild | null | undefined): vtext is VText {
  return typeof vtext === 'object' && vtext !== null && vtext.type === 'VirtualText'
}
