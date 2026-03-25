const fs = require('fs');
const path = require('path');

const baseDir = 'c:\\Users\\Lenovo\\Desktop\\SVM';
const imgDir = path.join(baseDir, 'product_images');
const jsonPath = path.join(baseDir, 'products.json');

const folders = fs.readdirSync(imgDir).filter(f => fs.statSync(path.join(imgDir, f)).isDirectory());
const products = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const folderMap = new Map();
folders.forEach(f => {
    const norm = normalize(f);
    if (!folderMap.has(norm)) folderMap.set(norm, []);
    folderMap.get(norm).push(f);
});

let fixCount = 0;
let failCount = 0;
let alreadyCorrect = 0;

products.forEach(p => {
    if (p.images && p.images.length > 0) {
        p.images = p.images.map(imgPath => {
            const parts = imgPath.split('/');
            if (parts.length >= 3 && parts[0] === 'product_images') {
                const jsonFolder = parts[1];
                const fileName = parts[2];
                const normJson = normalize(jsonFolder);

                // Try exact match first
                if (folders.includes(jsonFolder)) {
                    alreadyCorrect++;
                    return imgPath;
                }

                // Try normalized match
                if (folderMap.has(normJson)) {
                    const actual = folderMap.get(normJson)[0]; // Take first match
                    fixCount++;
                    return `product_images/${actual}/${fileName}`;
                }

                // Try partial match (e.g. "4oz_cupcontainer" matching "4oz_cup")
                const partialMatch = folders.find(f => {
                    const nf = normalize(f);
                    return nf.length > 3 && (normJson.includes(nf) || nf.includes(normJson));
                });
                
                if (partialMatch) {
                    fixCount++;
                    return `product_images/${partialMatch}/${fileName}`;
                }

                // If still failing, keep it
                failCount++;
                return imgPath;
            }
            return imgPath;
        });
    }
});

fs.writeFileSync(jsonPath, JSON.stringify(products, null, 2));
console.log(`Results:`);
console.log(`- Fixed: ${fixCount}`);
console.log(`- Already Correct: ${alreadyCorrect}`);
console.log(`- Still Broken/Missing Mapping: ${failCount}`);
