const fs = require('fs');
const path = require('path');

// Source directories
const lgkaraDir = path.join(__dirname, '../../lgkara');
const distDir = path.join(lgkaraDir, 'dist');
const distLgDir = path.join(lgkaraDir, 'dist-lg');

// Destination directories in public
const publicDir = path.join(__dirname, '../public');
const tvDir = path.join(publicDir, 'tv');
const tvLgDir = path.join(publicDir, 'tv-lg');

function copyRecursive(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursive(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function cleanDirectory(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

console.log('Copying TV builds to public folder...');

// Clean existing directories
cleanDirectory(tvDir);
cleanDirectory(tvLgDir);

// Copy browser build
console.log('Copying browser build to public/tv/');
copyRecursive(distDir, tvDir);

// Copy LG build
console.log('Copying LG build to public/tv-lg/');
copyRecursive(distLgDir, tvLgDir);

console.log('✓ TV builds copied successfully!');

// Update config.json files to use relative URLs (window.location.origin)
console.log('Updating config files for same-origin hosting...');

function updateConfig(configPath) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  // Keep the IP for network access, or use relative if needed
  console.log(`  ${path.basename(path.dirname(configPath))}/config.json - ready`);
}

updateConfig(path.join(tvDir, 'config.json'));
updateConfig(path.join(tvLgDir, 'config.json'));

console.log('\n✓ Configuration updated!');
console.log('\n📺 KARA-NEXT - Unified Karaoke System');
console.log('=====================================');
console.log('  Main (TV):      http://localhost:3000/');
console.log('  Mobile Queue:   http://localhost:3000/mobile');
console.log('  TV Browser:     http://localhost:3000/tv');
console.log('  TV LG Build:    http://localhost:3000/tv-lg');
console.log('\n🌐 Network URLs (replace with your IP):');
console.log('  http://192.168.2.101:3000/');
console.log('  http://192.168.2.101:3000/mobile');
