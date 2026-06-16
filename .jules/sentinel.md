## 2025-02-09 - Fix SSRF bypasses via IPv6 in isPrivateOrLocalHost

**Vulnerability:** The application was vulnerable to SSRF bypasses because it was missing checks for IPv6 loopback (`[::]`), link-local (`[fe80::1]`), and unique-local (`[fc00::1]`) addresses, as well as IPv4-mapped IPv6 formats (like `[::ffff:127.0.0.1]` or `[::ffff:7f00:1]`).
**Learning:** Only checking for localhost strings or basic IPv4 formats is insufficient because modern Node.js and systems interpret various IPv6 representations as loopback or local destinations, potentially allowing access to private services.
**Prevention:** Always validate hostnames against all IPv6 link-local, unique-local, unspecified address formats, and extract the inner IP for IPv4-mapped addresses to perform normal private IP validation.
