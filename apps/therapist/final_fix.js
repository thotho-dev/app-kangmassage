const fs = require('fs');
const path = require('path');

const files = [
  'app/(auth)/login.tsx',
  'app/(tabs)/orders.tsx',
  'app/notifications/settings.tsx'
].map(f => path.join('d:/PERSONAL FILE/App Pijat On-Demand/apps/therapist', f));

files.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');

  // Fix t.Light or COLORS.Light
  content = content.replace(/t\.Light/g, "t.primaryLight");
  content = content.replace(/COLORS\.Light/g, "'#F3F4F6'");
  
  // Fix bad react import in orders.tsx
  if (filePath.endsWith('orders.tsx')) {
    content = content.replace("import { COLORS } from 'react';", "");
    if (!content.includes("import { COLORS } from '../../constants/Theme'")) {
       content = content.replace("import { useThemeColors } from '../../store/themeStore';", "import { useThemeColors } from '../../store/themeStore';\nimport { COLORS } from '../../constants/Theme';");
    }
  }

  // Generic t used outside component
  if (filePath.endsWith('settings.tsx')) {
    content = content.replace(/color: t\.text/g, "color: '#1E3A8A'");
    content = content.replace(/color: t\.secondary/g, "color: '#F97316'");
    content = content.replace(/color: t\.success/g, "color: '#10B981'");
    content = content.replace(/color: t\.warning/g, "color: '#F59E0B'");
    content = content.replace(/color: t\.danger/g, "color: '#EF4444'");
    content = content.replace(/color: t\.info/g, "color: '#3B82F6'");
  }

  fs.writeFileSync(filePath, content);
  console.log('Fixed', filePath);
});
