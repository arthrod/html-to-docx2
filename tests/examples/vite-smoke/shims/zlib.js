const unsupported = (apiName) => () => {
  throw new Error(`${apiName} is not available in browser zlib shim`)
}

export const constants = {
  BROTLI_OPERATION_FLUSH: 2,
  BROTLI_OPERATION_FINISH: 3,
  Z_SYNC_FLUSH: 2,
}

export const createBrotliDecompress = unsupported('zlib.createBrotliDecompress')
export const createUnzip = unsupported('zlib.createUnzip')

const zlibShim = {
  constants,
  createBrotliDecompress,
  createUnzip,
}

export default zlibShim
