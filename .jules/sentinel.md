## 2024-05-15 - SSRF Vulnerability via Fetch

**Vulnerability:** The application uses `fetch()` directly on user-provided URLs in `src/utils/image.ts`, `src/utils/image-to-base64.ts`, and `src/utils/image-browser.ts` without validating the URL protocol. This allows `file://` protocols, leading to Local File Inclusion (LFI).
**Learning:** Naively passing strings to `fetch()` without a URL parse check enables unintended protocol resolution.
**Prevention:** Always parse URLs and assert an explicit allowlist (like `http:`, `https:`, `data:`, `blob:`) before invoking fetch. In this codebase, to support relative URLs without breaking them, use `try...catch` block that parses with a dummy base URL fallback. Ensure the generic `new Error(Invalid URL)` is thrown on failure so existing caching tests do not break.
## 2026-05-16 - Insecure Random Number Generation
**Vulnerability:** The function `generateHexId` in `src/tracking.ts` used `Math.random()` to generate random IDs, which is not cryptographically secure and could lead to collision or predictability.
**Learning:** Using `Math.random()` for generating sensitive or strictly unique values like tokens and IDs introduces a potential vulnerability because its pseudo-random sequences can be predicted.
**Prevention:** Replace `Math.random()` with `crypto.getRandomValues()` utilizing a pre-allocated typed array to provide cryptographically secure pseudo-random numbers efficiently.
