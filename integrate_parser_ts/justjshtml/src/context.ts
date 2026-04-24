export class FragmentContext {
  namespace: string | null
  tagName: string
  tag_name: string
  constructor(tagName: string, namespace: string | null = null) {
    this.tagName = tagName
    this.tag_name = tagName
    this.namespace = namespace
  }
}
