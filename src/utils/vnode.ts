export type VNode = {
  children?: VNode[]
  [key: string]: VNode[] | string | number | boolean | null | undefined
}

export const vNodeHasChildren = (vNode: VNode | null | undefined): boolean =>
  Boolean(vNode?.children && Array.isArray(vNode.children) && vNode.children.length)
