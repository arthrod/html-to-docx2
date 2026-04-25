const fs = require('fs');
let content = fs.readFileSync('src/helpers/xml-builder.ts', 'utf8');

// Add inline comment to explain the optimization on the hottest path
content = content.replace(
  "const runPropertiesFragment = buildRunProperties({ ...attributes })",
  "// Optimization: Shallow spread is used instead of deep cloning for significant performance gains\n  const runPropertiesFragment = buildRunProperties({ ...attributes })"
);

content = content.replace(
  "let tempAttributes: RunAttributes = { ...baseAttributes }",
  "// Optimization: Shallow spread used to prevent expensive memory allocations\n    let tempAttributes: RunAttributes = { ...baseAttributes }"
);

fs.writeFileSync('src/helpers/xml-builder.ts', content);
