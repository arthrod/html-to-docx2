## 2025-02-21 - [CRITICAL] Prevent SSRF and LFI in Image Fetching Utilities

**Vulnerability:** The image fetching utilities (`downloadImageToBase64` in `image.ts` and `image-browser.ts`, and `downloadImage` in `image-to-base64.ts`) did not validate the URL protocol before calling `fetch()`. This allowed fetching arbitrary local files via `file://` or malicious domains via SSRF.
**Learning:** Naively passing unvalidated URLs to `fetch()` in Node.js (via Bun) enables SSRF and LFI. When validating URLs, relative paths must be parsed using a dummy base URL (e.g. `new URL(url, 'http://dummy.base')`) in a fallback catch block to avoid breaking the application, as native `URL` throws on relative paths.
**Prevention:** Always validate protocols (`http:`, `https:`, `data:`, `blob:`) for user-provided or fetched URLs. Implement safe relative URL parsing.
