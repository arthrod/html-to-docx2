## 2024-05-20 - SSRF and LFI in Unvalidated Image Fetching

**Vulnerability:** Found that the image fetching utilities (`downloadImageToBase64` in `image.ts` and `image-browser.ts`, and `downloadImage` in `image-to-base64.ts`) lacked robust URL validation, exposing the application to Server-Side Request Forgery (SSRF) and Local File Inclusion (LFI). Bun's `fetch` API inherently supports `file://` URLs, compounding the LFI risk.
**Learning:** Naive validation (e.g. only checking for `http:` or `https:`) is insufficient against SSRF bypasses via normalized octal/decimal IP formats (e.g., `http://2130706433/` for `127.0.0.1`), loopbacks, and private networking ranges.
**Prevention:** Implement comprehensive URL validation that sanitizes inputs using the `URL` API. Ensure the extracted hostname blocks explicitly both loopback/internal IP blocks and IPv4 shorthand bypasses before making requests.
