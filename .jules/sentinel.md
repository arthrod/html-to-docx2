## 2024-05-15 - SSRF Vulnerability via Fetch

**Vulnerability:** The application uses `fetch()` directly on user-provided URLs in `src/utils/image.ts`, `src/utils/image-to-base64.ts`, and `src/utils/image-browser.ts` without validating the URL protocol. This allows `file://` protocols, leading to Local File Inclusion (LFI).
**Learning:** Naively passing strings to `fetch()` without a URL parse check enables unintended protocol resolution.
**Prevention:** Always parse URLs and assert an explicit allowlist (like `http:`, `https:`, `data:`, `blob:`) before invoking fetch. In this codebase, to support relative URLs without breaking them, use `try...catch` block that parses with a dummy base URL fallback. Ensure the generic `new Error(Invalid URL)` is thrown on failure so existing caching tests do not break.

## 2025-02-28 - Insecure PRNG in Hex ID Generation

**Vulnerability:** The application used `Math.random()` to generate hex IDs for OOXML tracking elements in `src/tracking.ts`.
**Learning:** `Math.random()` is not cryptographically secure and its outputs are predictable, which could potentially allow attackers to guess or collide tracking element IDs.
**Prevention:** Use `globalThis.crypto.getRandomValues()` as the primary cryptographically secure PRNG, while maintaining a fallback to `Math.random()` for environments without the Web Crypto API. Always allocate buffers like `Uint32Array(1)` outside the loop to optimize hot path performance.
