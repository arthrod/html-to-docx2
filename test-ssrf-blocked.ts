import { downloadImageToBase64 as dl1 } from './src/utils/image.ts'
import { downloadImageToBase64 as dl2 } from './src/utils/image-browser.ts'
import { imageToBase64 as dl3 } from './src/utils/image-to-base64.ts'

async function testUrl(url: string, fn: Function, name: string) {
  try {
    await fn(url)
    console.error(`[FAIL] ${name} with ${url} -> did not throw`)
    process.exit(1)
  } catch (err: any) {
    if (err.message.includes('SSRF/LFI protection blocked request')) {
      console.log(`[PASS] ${name} with ${url} -> blocked correctly`)
    } else {
      console.error(`[FAIL] ${name} with ${url} -> threw wrong error: ${err.message}`)
      process.exit(1)
    }
  }
}

async function run() {
  const badUrls = [
    'http://localhost/image.png',
    'http://169.254.169.254/latest/meta-data/',
    'file:///etc/passwd',
    'javascript:alert(1)',
  ]

  for (const url of badUrls) {
    await testUrl(url, dl1, 'src/utils/image.ts')
    await testUrl(url, dl2, 'src/utils/image-browser.ts')
    await testUrl(url, dl3, 'src/utils/image-to-base64.ts')
  }
  console.log('All bad URLs blocked successfully by all functions.')
}

run()
