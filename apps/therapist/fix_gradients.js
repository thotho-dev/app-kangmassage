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
  let original = content;

  // 1. Replace main container gradients with View
  // Pattern: <LinearGradient colors={[t.primary, t.background]} style={styles.container}>
  content = content.replace(/<LinearGradient\s+colors=\{\[t\.primary,\s*t\.background\]\}\s+style=\{styles\.container\}>/g, '<View style={styles.container}>');
  content = content.replace(/<\/LinearGradient>/g, (match, offset) => {
     // This is naive, but we check if we replaced the opening tag
     // Actually, we can just look for the last one if we replaced the container.
     // But it's better to be precise.
     return match; 
  });

  // Safer way for container:
  if (content.includes('<View style={styles.container}>') && original.includes('<LinearGradient colors={[t.primary, t.background]} style={styles.container}>')) {
      // Find the corresponding closing tag. Usually the last </LinearGradient> for container
      const parts = content.split('</LinearGradient>');
      if (parts.length > 1) {
          // This is risky if there are multiple gradients.
      }
  }

  // 2. Alternative: Make the gradient solid by changing the colors array
  content = content.replace(/colors=\{\[t\.primary,\s*t\.background\]\}/g, 'colors={[t.background, t.background]}');
  content = content.replace(/colors=\{\[t\.primary,\s*t\.surface\]\}/g, 'colors={[t.surface, t.surface]}');
  
  // Headers often use primary -> background or primary -> something
  content = content.replace(/colors=\{\[t\.primary,\s*t\.background\]\}/g, 'colors={[t.primary, t.primary]}');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Processed', filePath);
  }
});
