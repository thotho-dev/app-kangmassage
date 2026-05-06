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

  // Fix cases where COLORS. or t. is followed by nothing
  content = content.replace(/colors=\[t\.,t\.\]/g, "colors={[t.primary, t.background]}");
  content = content.replace(/colors=\[t\.,\s*['\"]#?[0-9a-fA-F]+['\"].*?\]/g, (match) => match.replace('t.', 't.primary'));
  
  // Specific fix for SplashScreen index.tsx
  if (filePath.endsWith('app\\index.tsx')) {
    content = content.replace(/colors=\[t\.,t\.\]/g, "colors={[t.primary, t.background]}");
    content = content.replace(/colors=\[t\.,\s*['\"]#EA580C['\"]\]/g, "colors={[t.secondary, '#EA580C']}");
    content = content.replace(/color=\{t\.\}/g, "color={t.white}");
    content = content.replace(/borderColor:t\./g, "borderColor: t.secondary");
    content = content.replace(/shadowColor:t\./g, "shadowColor: t.secondary");
    content = content.replace(/color:t\./g, "color: t.white");
  }

  // General fixes for t.
  content = content.replace(/backgroundColor:t\./g, "backgroundColor: t.background");
  content = content.replace(/color:t\./g, "color: t.text");
  content = content.replace(/borderColor:t\./g, "borderColor: t.border");
  content = content.replace(/shadowColor:t\./g, "shadowColor: t.text");
  content = content.replace(/t\.Secondary/g, "t.textSecondary");
  content = content.replace(/t\.Muted/g, "t.textMuted");

  // Fix COLORS. in STATUS_COLOR
  if (filePath.endsWith('orders.tsx')) {
    content = content.replace(/pending:COLORS\./g, "pending: '#F97316'");
    content = content.replace(/active:COLORS\./g, "active: '#10B981'");
    content = content.replace(/completed:COLORS\./g, "completed: '#3B82F6'");
    content = content.replace(/cancelled:COLORS\./g, "cancelled: '#EF4444'");
  }
  
  // Generic cleanup for any remaining COLORS. or t. at end of line or before comma/brace
  content = content.replace(/COLORS\.(?=[\s,\}])/g, "COLORS.secondary");
  content = content.replace(/t\.(?=[\s,\}])/g, "t.text");

  fs.writeFileSync(filePath, content);
  console.log('Fixed', filePath);
});
