const fs = require('fs');
const path = require('path');

const baseDir = 'c:\\Users\\Lenovo\\Desktop\\SVM';
const imgDir = path.join(baseDir, 'product_images');
const jsonPath = path.join(baseDir, 'products.json');

if (!fs.existsSync(imgDir)) { console.error("Missing product_images"); process.exit(1); }

const folders = fs.readdirSync(imgDir).filter(f => fs.statSync(path.join(imgDir, f)).isDirectory());
const products = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Create a map of normalized folder names to actual folder names
const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const folderMap = new Map();
folders.forEach(f => {
    folderMap.set(normalize(f), f);
});

let fixCount = 0;
let unchangedCount = 0;
let missingFolderCount = 0;

products.forEach(p => {
    if (p.images && p.images.length > 0) {
        p.images = p.images.map(imgPath => {
            const parts = imgPath.split('/');
            if (parts.length >= 3 && parts[0] === 'product_images') {
                const jsonFolderName = parts[1];
                const fileName = parts[2];
                
                const normJsonFolder = normalize(jsonFolderName);
                if (folderMap.has(normJsonFolder)) {
                    const actualFolder = folderMap.get(normJsonFolder);
                    if (actualFolder !== jsonFolderName) {
                        fixCount++;
                        return `product_images/${actualFolder}/${fileName}`;
                    } else {
                        unchangedCount++;
                    }
                } else {
                    missingFolderCount++;
                    // console.log(`Missing folder: ${jsonFolderName} (norm: ${normJsonFolder})`);
                }
            }
            return imgPath;
        });
    }
});

fs.writeFileSync(jsonPath, JSON.stringify(products, null, 2));
console.log(`Results:`);
console.log(`- Fixed: ${fixCount}`);
console.log(`- Already Correct: ${unchangedCount}`);
console.log(`- Still Missing Folders: ${missingFolderCount}`);
