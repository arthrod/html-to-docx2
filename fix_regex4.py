import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # The most bulletproof way to do this using simple string replacement:

    replacements = [
        # rgbRegex
        ("""if (rgbRegex.test(colorCodeString)) {
    const matchedParts = colorCodeString.match(rgbRegex)
    if (matchedParts) {""",
         """const matchedParts = colorCodeString.match(rgbRegex)
  if (matchedParts) {"""),
        # hslRegex
        ("""if (hslRegex.test(colorCodeString)) {
    const matchedParts = colorCodeString.match(hslRegex)
    if (matchedParts) {""",
         """const matchedParts2 = colorCodeString.match(hslRegex)
  if (matchedParts2) {"""),
        # hexRegex
        ("""if (hexRegex.test(colorCodeString)) {
    const matchedParts = colorCodeString.match(hexRegex)
    if (matchedParts) {""",
         """const matchedParts3 = colorCodeString.match(hexRegex)
  if (matchedParts3) {"""),
        # hex3Regex
        ("""if (hex3Regex.test(colorCodeString)) {
    const matchedParts = colorCodeString.match(hex3Regex)
    if (matchedParts) {""",
         """const matchedParts4 = colorCodeString.match(hex3Regex)
  if (matchedParts4) {"""),

        # fontSizeString
        ("""if (pointRegex.test(fontSizeString)) {
    const matchedParts = fontSizeString.match(pointRegex)
    if (matchedParts) {""",
         """const matchedParts1 = fontSizeString.match(pointRegex)
  if (matchedParts1) {"""),
        ("""if (pixelRegex.test(fontSizeString)) {
    const matchedParts = fontSizeString.match(pixelRegex)
    if (matchedParts) {""",
         """const matchedParts2 = fontSizeString.match(pixelRegex)
  if (matchedParts2) {"""),

        # rowHeightString
        ("""if (pointRegex.test(rowHeightString)) {
    const matchedParts = rowHeightString.match(pointRegex)
    if (matchedParts) {""",
         """const matchedParts1 = rowHeightString.match(pointRegex)
  if (matchedParts1) {"""),
        ("""if (pixelRegex.test(rowHeightString)) {
    const matchedParts = rowHeightString.match(pixelRegex)
    if (matchedParts) {""",
         """const matchedParts2 = rowHeightString.match(pixelRegex)
  if (matchedParts2) {"""),
        ("""if (cmRegex.test(rowHeightString)) {
    const matchedParts = rowHeightString.match(cmRegex)
    if (matchedParts) {""",
         """const matchedParts3 = rowHeightString.match(cmRegex)
  if (matchedParts3) {"""),
        ("""if (inchRegex.test(rowHeightString)) {
    const matchedParts = rowHeightString.match(inchRegex)
    if (matchedParts) {""",
         """const matchedParts4 = rowHeightString.match(inchRegex)
  if (matchedParts4) {"""),

        # columnWidthString
        ("""if (pointRegex.test(columnWidthString)) {
    const matchedParts = columnWidthString.match(pointRegex)
    if (matchedParts) {""",
         """const matchedParts1 = columnWidthString.match(pointRegex)
  if (matchedParts1) {"""),
        ("""if (pixelRegex.test(columnWidthString)) {
    const matchedParts = columnWidthString.match(pixelRegex)
    if (matchedParts) {""",
         """const matchedParts2 = columnWidthString.match(pixelRegex)
  if (matchedParts2) {"""),
        ("""if (cmRegex.test(columnWidthString)) {
    const matchedParts = columnWidthString.match(cmRegex)
    if (matchedParts) {""",
         """const matchedParts3 = columnWidthString.match(cmRegex)
  if (matchedParts3) {"""),
        ("""if (inchRegex.test(columnWidthString)) {
    const matchedParts = columnWidthString.match(inchRegex)
    if (matchedParts) {""",
         """const matchedParts4 = columnWidthString.match(inchRegex)
  if (matchedParts4) {"""),
        ("""if (percentageRegex.test(columnWidthString)) {
    const matchedParts = columnWidthString.match(percentageRegex)
    if (matchedParts) {""",
         """const matchedParts5 = columnWidthString.match(percentageRegex)
  if (matchedParts5) {"""),

        # marginString
        ("""if (pointRegex.test(marginString)) {
    const matchedParts = marginString.match(pointRegex)
    if (matchedParts) {""",
         """const matchedParts1 = marginString.match(pointRegex)
  if (matchedParts1) {"""),
        ("""if (pixelRegex.test(marginString)) {
    const matchedParts = marginString.match(pixelRegex)
    if (matchedParts) {""",
         """const matchedParts2 = marginString.match(pixelRegex)
  if (matchedParts2) {"""),

        # size
        ("""if (pointRegex.test(size)) {
    const matchedParts = size.match(pointRegex)""",
         """const matchedParts1 = size.match(pointRegex)
  if (matchedParts1) {"""),
        ("""} else if (pixelRegex.test(size)) {
    const matchedParts = size.match(pixelRegex)""",
         """} else {
    const matchedParts2 = size.match(pixelRegex)
    if (matchedParts2) {"""),
    ]

    # Actually wait. If we replace:
    # `if (regex.test(str)) {` with nothing, we have to also remove the closing brace.
    # What if we just replace the `.test` call with a variable assignment that checks truthiness?
    # `if ((matchedParts = str.match(regex))) {`
    # and then we just use `matchedParts` inside!
    # And we don't declare it inside `if()`, but we just declare `let matchedParts;` at the top of the function!
    pass
