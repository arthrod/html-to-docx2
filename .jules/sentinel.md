## 2025-04-13 - Add SSRF/LFI protection to image fetching
**Vulnerability:** Unvalidated URLs passed to `fetch()` allowed LFI via `file://` protocols and potential SSRF.
**Learning:** Protocol allowlisting using `new URL()` must place custom protocol restriction checks outside the `try` block so specific protocol errors aren't swallowed by the generic 'Invalid URL' catch block.
**Prevention:** Always validate protocols (`http:`, `https:`, `data:`, `blob:`) on URLs passed to native fetch functions to prevent local scheme abuse, and structure the `try/catch` properly.
