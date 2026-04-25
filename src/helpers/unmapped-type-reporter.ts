export type UnmappedTypeLocation = 'block' | 'formatting' | 'inline'

export type UnmappedTypeInfo = {
  context?: string
  location: UnmappedTypeLocation
  tagName: string
}

export type UnmappedTypeHandling = {
  enabled?: boolean
  logToConsole?: boolean
  onUnmappedType?: (info: UnmappedTypeInfo) => void
}

export const reportUnmappedType = (
  info: UnmappedTypeInfo,
  handling?: UnmappedTypeHandling
): void => {
  if (!handling || handling.enabled !== true) {
    return
  }
  if (handling.logToConsole === true) {
    const contextSuffix =
      info.context !== undefined && info.context !== '' ? ` (context: ${info.context})` : ''
    // eslint-disable-next-line no-console
    console.warn(
      `[html-to-docx] unmapped ${info.location} type: <${info.tagName}>${contextSuffix}`
    )
  }
  if (typeof handling.onUnmappedType === 'function') {
    handling.onUnmappedType(info)
  }
}
