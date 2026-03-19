import { isValidImageUrl } from './src/utils/url.ts'

const urlsToTest = [
  { url: 'https://example.com/image.png', expect: true },
  { url: 'http://example.com/image.png', expect: true },
  { url: '/relative/path/to/image.png', expect: true },
  { url: 'data:image/png;base64,123', expect: true },
  { url: 'blob:http://localhost/123', expect: true },

  // SSRF testing
  { url: 'http://localhost/image.png', expect: false },
  { url: 'http://127.0.0.1/image.png', expect: false },
  { url: 'http://2130706433/image.png', expect: false },
  { url: 'http://0177.0.0.1/image.png', expect: false },
  { url: 'http://192.168.1.1/image.png', expect: false },
  { url: 'http://10.0.0.1/image.png', expect: false },
  { url: 'http://172.16.0.1/image.png', expect: false },
  { url: 'http://169.254.169.254/metadata', expect: false },
  { url: 'http://[::1]/image.png', expect: false },

  // LFI testing
  { url: 'file:///etc/passwd', expect: false },
  { url: 'javascript:alert(1)', expect: false },
  { url: 'ftp://example.com/image.png', expect: false },
]

let failed = false
for (const test of urlsToTest) {
  const result = isValidImageUrl(test.url)
  if (result !== test.expect) {
    console.error(`[FAIL] ${test.url} -> expected ${test.expect}, got ${result}`)
    failed = true
  } else {
    console.log(`[PASS] ${test.url} -> ${result}`)
  }
}

if (failed) {
  process.exit(1)
} else {
  console.log('All tests passed!')
}
