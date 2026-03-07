// @ts-check

import getDimensions from '../src/utils/image-dimensions'

/**
 * @param {...number} values
 * @returns {Uint8Array}
 */
const bytes = (...values) => Uint8Array.from(values)

describe('getImageDimensions', () => {
  test('parses png dimensions', () => {
    const png = new Uint8Array(32)
    png[0] = 0x89
    png[1] = 0x50
    png[2] = 0x4e
    png[3] = 0x47
    png[16] = 0x00
    png[17] = 0x00
    png[18] = 0x01
    png[19] = 0x90 // 400
    png[20] = 0x00
    png[21] = 0x00
    png[22] = 0x00
    png[23] = 0xc8 // 200

    expect(getDimensions(png)).toEqual({
      height: 200,
      type: 'png',
      width: 400,
    })
  })

  test('parses jpeg dimensions from sof marker', () => {
    const jpeg = bytes(
      0xff,
      0xd8,
      0xff,
      0xe0,
      0x00,
      0x10,
      0x4a,
      0x46,
      0x49,
      0x46,
      0x00,
      0x01,
      0x01,
      0x00,
      0x00,
      0x01,
      0x00,
      0x01,
      0x00,
      0x00,
      0xff,
      0xc0,
      0x00,
      0x11,
      0x08,
      0x01,
      0x2c,
      0x02,
      0x58,
      0x03,
      0x01,
      0x11,
      0x00
    )

    expect(getDimensions(jpeg)).toEqual({
      height: 300,
      type: 'jpg',
      width: 600,
    })
  })

  test('falls back for malformed jpeg without sof marker', () => {
    const malformedJpeg = bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x00, 0x00)

    expect(getDimensions(malformedJpeg)).toEqual({
      height: 100,
      type: 'jpg',
      width: 100,
    })
  })

  test('parses gif dimensions', () => {
    const gif = bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x20, 0x03, 0x58, 0x02)

    expect(getDimensions(gif)).toEqual({
      height: 600,
      type: 'gif',
      width: 800,
    })
  })

  test('parses bmp dimensions', () => {
    const bmp = new Uint8Array(26)
    bmp[0] = 0x42
    bmp[1] = 0x4d
    bmp[18] = 0x90
    bmp[19] = 0x01 // 400
    bmp[22] = 0xc8
    bmp[23] = 0x00 // 200

    expect(getDimensions(bmp)).toEqual({
      height: 200,
      type: 'bmp',
      width: 400,
    })
  })

  test('parses webp vp8 dimensions', () => {
    const webp = new Uint8Array(30)
    webp.set([0x52, 0x49, 0x46, 0x46], 0)
    webp.set([0x57, 0x45, 0x42, 0x50], 8)
    webp.set([0x56, 0x50, 0x38, 0x20], 12)
    webp[26] = 0x80
    webp[27] = 0x02 // 640
    webp[28] = 0xe0
    webp[29] = 0x01 // 480

    expect(getDimensions(webp)).toEqual({
      height: 480,
      type: 'webp',
      width: 640,
    })
  })

  test('parses webp vp8l dimensions', () => {
    const webp = new Uint8Array(30)
    webp.set([0x52, 0x49, 0x46, 0x46], 0)
    webp.set([0x57, 0x45, 0x42, 0x50], 8)
    webp.set([0x56, 0x50, 0x38, 0x4c], 12)

    const widthMinus1 = 31
    const heightMinus1 = 23
    const packed = widthMinus1 | (heightMinus1 << 14)
    webp[21] = packed & 0xff
    webp[22] = (packed >> 8) & 0xff
    webp[23] = (packed >> 16) & 0xff
    webp[24] = (packed >> 24) & 0xff

    expect(getDimensions(webp)).toEqual({
      height: 24,
      type: 'webp',
      width: 32,
    })
  })

  test('falls back for unknown formats', () => {
    expect(getDimensions(bytes(0x00, 0x11, 0x22, 0x33))).toEqual({
      height: 100,
      type: 'unknown',
      width: 100,
    })
  })
})
