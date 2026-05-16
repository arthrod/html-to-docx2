🎯 **What:**
The application was vulnerable to Server-Side Request Forgery (SSRF) when fetching images via URL parameters. An attacker could pass a URL pointing to local or private IP addresses (e.g. `http://localhost`, `http://127.0.0.1`, `http://10.0.0.1`, or `http://[::1]`) causing the server backend or polyfilled client backend to query internal services.

⚠️ **Risk:**
HIGH. If left unfixed, attackers could interact with internal-only APIs, discover internal networks, or bypass firewalls by forcing the service to make HTTP requests to restricted environments. Advanced bypasses using integers (e.g. `2130706433`), hex encodings, or mapped IPv6 addresses could also bypass naive string-matching filters.

🛡️ **Solution:**
- Created an `isLocalOrPrivateHost` validation function in `src/utils/url.ts` that safely validates parsed URL hostnames against loopback, private IPv4, local IPv6, and standard `localhost` strings.
- Added a validation layer inside `downloadImageToBase64` in `src/utils/image-browser.ts` and `downloadImage` in `src/utils/image-to-base64.ts` to explicitly block these hosts before issuing `fetch` requests.
- Maintained compatibility with external domains while returning identical generic `Invalid URL` errors to avoid information leakage and maintain existing caching test consistency.
- Introduced a new test block ensuring SSRF protections successfully defend against various common attack patterns.
