const fs = require('fs');
const path = require('path');

const getFiles = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
};

const rootDir = 'd:/PERSONAL FILE/App Pijat On-Demand/apps/therapist/app';
const files = getFiles(rootDir);

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  // 1. Fix cases where we replaced opening tag but not closing
  if (content.includes('<View style={styles.container}>') && content.includes('</LinearGradient>')) {
      // Find the last </LinearGradient> and replace it with </View>
      const lastIndex = content.lastIndexOf('</LinearGradient>');
      if (lastIndex !== -1) {
          content = content.substring(0, lastIndex) + '</View>' + content.substring(lastIndex + '</LinearGradient>'.length);
          changed = true;
      }
  }

  // 2. Fix other LinearGradient backgrounds that should be solid
  // If we want it solid, the best way is to keep LinearGradient but use same colors
  // My previous script already did some of this, but let's ensure consistency.
  
  // Headers: primary to primary
  content = content.replace(/colors=\{\[t\.primary,\s*t\.background\]\}/g, 'colors={[t.primary, t.primary]}');
  content = content.replace(/colors=\{\[t\.primary,\s*t\.surface\]\}/g, 'colors={[t.primary, t.primary]}');

  if (content !== fs.readFileSync(filePath, 'utf-8')) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed tags/gradients in', filePath);
  }
});
