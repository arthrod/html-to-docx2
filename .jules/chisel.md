## 2025-02-14 - Remove VNodeType and VTextType ad-hoc types
**Learning:** `VNodeType` and `VTextType` were redundant, ad-hoc loose type aliases for `VNode` and `VText`, leading to unsafe `as VNodeType` and `as VTextType` assertions that violated linting rules and could mask runtime bugs.
**Action:** Replace `VNodeType` and `VTextType` entirely with the actual class definitions `VNode` and `VText` imported from `../vdom/index.js`, removing all assertions and letting type guards like `isVNode` natively narrow the union types.
