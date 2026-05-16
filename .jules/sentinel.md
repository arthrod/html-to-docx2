## 2024-05-15 - SSRF Vulnerability via Fetch

**Vulnerability:** The application uses `fetch()` directly on user-provided URLs in `src/utils/image.ts`, `src/utils/image-to-base64.ts`, and `src/utils/image-browser.ts` without validating the URL protocol. This allows `file://` protocols, leading to Local File Inclusion (LFI).
**Learning:** Naively passing strings to `fetch()` without a URL parse check enables unintended protocol resolution.
**Prevention:** Always parse URLs and assert an explicit allowlist (like `http:`, `https:`, `data:`, `blob:`) before invoking fetch. In this codebase, to support relative URLs without breaking them, use `try...catch` block that parses with a dummy base URL fallback. Ensure the generic `new Error(Invalid URL)` is thrown on failure so existing caching tests do not break.
## 2026-05-16 - Insecure Random Number Generation

**Vulnerability:** The application used `Math.random()` in `generateHexId` within `src/tracking.ts` to generate identifiers.
**Learning:** `Math.random()` is not cryptographically secure, which allows prediction of tracking IDs and potential collision attacks. Replaced with `globalThis.crypto.getRandomValues`. Pre-allocated a `Uint32Array` outside the function to avoid instantiation overhead per call in performance-critical paths.
**Prevention:** Always use `globalThis.crypto.getRandomValues()` for identifier generation. To preserve performance in hot paths, pre-allocate the random buffer globally rather than recreating it inside loops.
