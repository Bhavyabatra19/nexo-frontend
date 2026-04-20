const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'Nexo-main (1)', 'Nexo-main', 'components');
const targetDir = path.join(__dirname, 'src', 'components', 'landing');

// Ensure target directory exists
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy components and add "use client" + replace motion imports
const files = fs.readdirSync(sourceDir);
for (const file of files) {
  if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
    const srcPath = path.join(sourceDir, file);
    const destPath = path.join(targetDir, file);
    
    let content = fs.readFileSync(srcPath, 'utf-8');
    
    // Convert framer motion imports just in case
    content = content.replace(/from ['"]motion\/react['"]/g, 'from "framer-motion"');
    content = content.replace(/from ['"]motion['"]/g, 'from "framer-motion"');

    // Make sure 'lucide-react' is used
    // If it's pure CSS, just write it
    if (file.endsWith('.tsx')) {
      if (!content.includes('"use client"') && !content.includes("'use client'")) {
        content = `"use client";\n\n` + content;
      }
    }
    
    fs.writeFileSync(destPath, content);
    console.log(`Copied ${file}`);
  }
}

console.log("Migration complete.");
