
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2024-05-24 - [Explicit Class Property Declarations for Dynamically Assigned Variables]
**Learning:** [In JS codebases migrated to TS, dynamically assigning properties to an instance that hasn't declared them in its class structure will generate TS(2551) or TS(2339). Suppressing these errors hides the fact that the shape of the class instance is undefined, making autocomplete and type narrowing impossible down the line.]
**Action:** [Instead of suppressing these assignment errors, trace what type is being assigned (in this case an array of Node objects populated within TreeBuilder's constructor internals via `open_elements`) and declare that explicit property (`openElements!: Node[]`) on the corresponding class.]
