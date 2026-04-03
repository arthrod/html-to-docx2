## 2025-02-14 - Prevent SSRF and LFI via unvalidated bun fetch calls
**Vulnerability:** Fetch utilities were passing unvalidated user-supplied URLs directly to `fetch()`. In Bun, `fetch("file:///...")` resolves to reading local files, exposing a critical Local File Inclusion (LFI) vulnerability along with SSRF capabilities.
**Learning:** Bun's implementation of the native `fetch` API does not restrict the `file://` protocol by default. Generic string-based URL validation is insufficient because `fetch()` strips whitespace allowing trivial bypasses (e.g., `   file:///etc/passwd`).
**Prevention:** Always validate protocols strictly using `new URL(String(url).trim(), 'http://dummy.base')` to verify it matches an allowlist (`http:`, `https:`, `data:`, `blob:`) before execution.
