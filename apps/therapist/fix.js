
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
  'app/index.tsx',
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
  
  // Fix imports
  content = content.replace(/import\s*\{\s*,\s*/g, 'import { ');
  content = content.replace(/import\s*\{\s*SPACING/g, 'import { SPACING');
  
  // Fix missing 't' before '.'
  content = content.replace(/(?<![a-zA-Z0-9_])\.(primary|secondary|success|warning|danger|info|background|surface|border|text|white|black|transparent|gradient)/g, 't.');

  // Move constants that use 't' INSIDE the component, OR replace t. back with COLORS.
  // Actually it's easier to replace 't.' with 'COLORS.' outside the component function.
  // Let's just restore COLORS to these files where we broke them and do it properly.

  fs.writeFileSync(filePath, content);
  console.log('Fixed', filePath);
});

