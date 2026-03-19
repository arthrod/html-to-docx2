const regex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const str = "#FFFFFF";

console.time('match_only');
for (let i = 0; i < 1_000_000; i++) {
    const match = str.match(regex);
    if (match) {
        let x = match[1];
    }
}
console.timeEnd('match_only');

console.time('test_then_match');
for (let i = 0; i < 1_000_000; i++) {
    if (regex.test(str)) {
        const match = str.match(regex);
        if (match) {
            let x = match[1];
        }
    }
}
console.timeEnd('test_then_match');
