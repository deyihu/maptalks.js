const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, './dist');
const result = [];

function readDTS(p) {
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
        const files = fs.readdirSync(p);
        files.forEach(file => {
            const p1 = path.join(p, `./${file}`);
            readDTS(p1);
        });
    } else {
        if (p.includes('d.ts')) {
            let filePath = p.split('dist')[1];
            while (filePath.includes('\\')) {
                filePath = filePath.replace('\\', '/');
            }
            filePath = filePath.substring(1, Infinity);
            result.push({
                path: filePath,
                content: fs.readFileSync(p).toString()
            });
        }
    }
}
readDTS(root);
fs.writeFileSync(path.join(__dirname, './dist/maptalks.dts.json'), JSON.stringify(result));
fs.writeFileSync(path.join(__dirname, './../builder-docs/src/public/lib/maptalks.dts.json'), JSON.stringify(result));