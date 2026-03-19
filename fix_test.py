import re

with open("src/helpers/xml-builder.ts", "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if ".test(" in line:
        print(f"{i}: {line.strip()}")
