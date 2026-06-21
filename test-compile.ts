import { VNode, VText } from './src/vdom/index.js'
type VTree = VNode | VText | (VNode | VText)[]
const x: VTree = new VNode('div')
const y: VTree = new VText('hello')
const z: VTree = [new VNode('span'), new VText('world')]
console.log(x, y, z)
