## 2024-05-18 - [Fix Local File Inclusion (LFI) in image fetching]

**Vulnerability:** The `fetch` calls in image downloading utilities (`downloadImage`, `downloadImageToBase64`) were lacking validation on the protocols of URLs they consumed, allowing local files to be read (e.g. `file:///etc/passwd`) or arbitrary protocol abuses if an attacker could control the image sources.
**Learning:** `fetch` inherently supports multiple schemes depending on the environment, and if not correctly restricted, user-supplied image URLs can lead to Server-Side Request Forgery or Local File Inclusion.
**Prevention:** Always validate and whitelist URL schemes using the native `URL` constructor (e.g. `new URL(String(url).trim(), 'http://dummy.base').protocol`) to strictly allow `http:`, `https:`, `data:`, or `blob:` before passing them to network calls like `fetch`.
