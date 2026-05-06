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

  // 1. Revert <View style={styles.container}> back to <LinearGradient colors={[t.background, t.background]} style={styles.container}>
  // to maintain structure if needed, or just ensure both are View.
  // Actually, let's make the container a View everywhere.
  content = content.replace(/<LinearGradient\s+colors=\{\[t\.background,\s*t\.background\]\}\s+style=\{styles\.container\}>/g, '<View style={styles.container}>');
  
  // 2. Fix broken headers
  // If line has <LinearGradient and next few lines have </View> where it should be </LinearGradient>
  // Better: replace <LinearGradient ... style={styles.header}> with <View style={styles.header}>
  content = content.replace(/<LinearGradient\s+colors=\{\[t\.(background|primary|surface),\s*t\.(background|primary|surface)\]\}\s+style=\{styles\.header\}>/g, '<View style={styles.header}>');

  // 3. Fix the closing tags. 
  // We need to count open LinearGradients and Views.
  // A simpler way: if we changed a header or container to View, we MUST change one </LinearGradient> to </View>.
  
  // Let's just do a blanket replacement of LinearGradient with View for headers and containers
  // and then fix the tags by replacing </LinearGradient> with </View> ONLY IF they don't match.
  
  // Actually, let's just use the fact that headers and containers are usually the only ones we changed.
  
  // Let's try to restore a clean state.
  // Replace all <LinearGradient with colors={[t.X, t.X]} with <View
  content = content.replace(/<LinearGradient\s+colors=\{\[t\.(\w+),\s*t\.(\w+)\]\}\s+style=\{styles\.(\w+)\}>/g, (match, c1, c2, style) => {
      if (c1 === c2) {
          return `<View style={[styles.${style}, { backgroundColor: t.${c1} }]}>`;
      }
      return match;
  });

  // Now fix closing tags. If we have more </LinearGradient> than <LinearGradient
  const openCount = (content.match(/<LinearGradient/g) || []).length;
  const closeCount = (content.match(/<\/LinearGradient>/g) || []).length;
  
  if (closeCount > openCount) {
      for (let i = 0; i < (closeCount - openCount); i++) {
          content = content.replace(/<\/LinearGradient>/, '</View>');
      }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Final fix in', filePath);
  }
});
