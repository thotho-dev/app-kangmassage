const fs = require('fs');
const path = require('path');

const files = [
  'app/support/terms.tsx',
  'app/support/privacy.tsx',
  'app/support/help.tsx',
  'app/support/faq.tsx',
  'app/support/about.tsx',
  'app/profile/payment.tsx',
  'app/profile/change-phone.tsx',
  'app/profile/change-password.tsx',
  'app/profile/address.tsx',
  'app/orders/[id].tsx',
  'app/onboarding.tsx',
  'app/notifications/settings.tsx',
  'app/(tabs)/orders.tsx',
  'app/(tabs)/notifications.tsx',
  'app/(tabs)/earnings.tsx',
  'app/(auth)/_layout.tsx',
  'app/(auth)/otp.tsx',
  'app/(auth)/login.tsx',
  'app/(auth)/forgot-password.tsx'
].map(f => path.join('d:/PERSONAL FILE/App Pijat On-Demand/apps/therapist', f));

files.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  if (!content.includes('COLORS')) return;

  // 1. Determine level depth
  const inTabsAuth = filePath.includes('(tabs)') || filePath.includes('(auth)');
  const inSubFolder = filePath.includes('profile\\') || filePath.includes('support\\') || filePath.includes('orders\\') || filePath.includes('notifications\\');
  let storeImport = '';
  if (inTabsAuth || inSubFolder) {
    storeImport = 'import { useThemeColors } from \'../../store/themeStore\';\n';
  } else {
    storeImport = 'import { useThemeColors } from \'../store/themeStore\';\n';
  }

  // 2. Add useThemeColors import
  if (!content.includes('useThemeColors')) {
    const importMatch = content.match(/import .* from 'react(-native)?';?/);
    if (importMatch) {
      content = content.replace(importMatch[0], importMatch[0] + '\n' + storeImport);
    } else {
      content = storeImport + content;
    }
  }

  // 3. Strip COLORS from Theme imports
  content = content.replace(/import\s*\{\s*COLORS\s*,?\s*/g, 'import { ');
  content = content.replace(/,\s*COLORS\b/g, '');
  content = content.replace(/import\s*\{\s*\}\s*from\s*'.*?Theme';?\n/g, ''); // empty imports

  // 4. Inject t and getStyles
  content = content.replace(/export default function \w+\([^)]*\)\s*\{/g, (match) => {
    return match + '\n  const t = useThemeColors();\n  const styles = getStyles(t);';
  });

  // 5. Replace StyleSheet.create
  content = content.replace(/const styles = StyleSheet\.create\(/g, 'const getStyles = (t: any) => StyleSheet.create(');

  // 6. Fix any dictionaries that use COLORS. Since we are renaming COLORS -> t,
  // those dictionaries will error out because 't' is undefined outside component.
  // Instead of completely writing a parser, let's just use `useThemeColors.getState()` or re-import COLORS for them.
  // Better yet, just re-add COLORS to the import if the file has STATUS_COLOR or similar dictionaries!
  const hasExternalDict = content.includes('const STATUS_COLOR') || content.includes('const STAT_COLORS');
  if (hasExternalDict) {
     content = content.replace(/import\s*\{/, 'import { COLORS, ');
  }

  // 7. Replace COLORS.xyz with t.xyz EXCEPT inside dictionaries.
  // Actually, replacing all COLORS. with t. is easy, then for external dicts replace t. with COLORS.
  content = content.replace(/COLORS\./g, 't.');

  if (hasExternalDict) {
    content = content.replace(/const STATUS_COLOR(.*?)};/gs, (match) => match.replace(/t\./g, 'COLORS.'));
    content = content.replace(/const STAT_COLORS(.*?)};/gs, (match) => match.replace(/t\./g, 'COLORS.'));
  }

  fs.writeFileSync(filePath, content);
  console.log('Converted', filePath);
});
