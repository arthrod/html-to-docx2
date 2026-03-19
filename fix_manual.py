import sys

def modify_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    replacements = [
        # rgbRegex
        ("""if (rgbRegex.test(colorCodeString)) {
    const matchedParts = colorCodeString.match(rgbRegex)
    if (matchedParts) {""",
         """const matchedParts1 = colorCodeString.match(rgbRegex)
  if (matchedParts1) {"""),
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

    ]

    for old, new in replacements:
        if old in content:
            # Note: We need to also remove the closing brace for the `if (regex.test(str)) {`!
            # It's always matched with the end of `if (matchedParts) {` block!
            # Wait! We can just do:
            # replace `if (regex.test(str)) {` with `{`
            pass

    # BETTER APPROACH!
    # Let's replace:
    # `if (XXXRegex.test(YYY)) {` with `{` IF the next line has `const ZZZ = YYY.match(XXXRegex)`

modify_file('src/helpers/xml-builder.ts')
