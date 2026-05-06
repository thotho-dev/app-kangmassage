
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

  // Fix imports completely
  content = content.replace(/import \{.*?SPACING.*?\} from '.*?Theme';/, (match) => {
    return match.replace(/\{\s*,?\s*/, '{ COLORS, ');
  });

  // Revert t. to COLORS.
  content = content.replace(/\bt\.(primary|secondary|success|warning|danger|info|background|surface|border|text|white|black|transparent|gradient)/g, 'COLORS.');
  
  // Revert . to COLORS. if any left over
  content = content.replace(/(?<![a-zA-Z0-9_])\.(primary|secondary|success|warning|danger|info|background|surface|border|text|white|black|transparent|gradient)/g, 'COLORS.');

  // Remove the injected t variables
  content = content.replace(/const t = useThemeColors\(\);\n\s*const styles = getStyles\(t\);/g, '');
  content = content.replace(/const getStyles = \(t: any\) => StyleSheet\.create/g, 'const styles = StyleSheet.create');
  
  // Remove useThemeColors import
  content = content.replace(/import \{ useThemeColors \} from '.*?';\n/g, '');

  fs.writeFileSync(filePath, content);
  console.log('Reverted', filePath);
});

