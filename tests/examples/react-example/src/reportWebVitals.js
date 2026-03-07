// @ts-check

/**
 * @typedef {import('web-vitals').ReportHandler} ReportHandler
 */

/**
 * @param {ReportHandler | undefined} onPerfEntry
 * @returns {Promise<void>}
 */
const reportWebVitals = async (onPerfEntry) => {
  if (typeof onPerfEntry === 'function') {
    const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals')
    getCLS(onPerfEntry)
    getFID(onPerfEntry)
    getFCP(onPerfEntry)
    getLCP(onPerfEntry)
    getTTFB(onPerfEntry)
  }
}

export default reportWebVitals
