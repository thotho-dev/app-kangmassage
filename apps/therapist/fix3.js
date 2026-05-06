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

  // Fix broken syntax
  content = content.replace(/\[t\.,t\.\]/g, '[t.primary, t.background]');
  content = content.replace(/color=\{t\.\}/g, 'color={t.text}');
  content = content.replace(/backgroundColor:t\.\s*\}/g, 'backgroundColor: t.background }');
  content = content.replace(/backgroundColor:t\.\s*,/g, 'backgroundColor: t.surface,'); // default to surface for items
  content = content.replace(/color:t\.\s*,/g, 'color: t.text,');
  content = content.replace(/color:t\.\s*\}/g, 'color: t.text }');
  content = content.replace(/color:t\.Secondary/g, 'color: t.textSecondary');
  content = content.replace(/color:t\.Muted/g, 'color: t.textMuted');
  content = content.replace(/color:t\.Info/g, 'color: t.info');
  content = content.replace(/color:t\.Warning/g, 'color: t.warning');
  content = content.replace(/color:t\.Danger/g, 'color: t.danger');
  content = content.replace(/color:t\.Success/g, 'color: t.success');
  content = content.replace(/t\.20/g, 't.secondary + \'20\''); // Just in case
  content = content.replace(/t\.,/g, 't.text,'); // fallback
  content = content.replace(/t\.\s*\}/g, 't.background }'); // fallback

  // Some specific fixes: container usually has background
  content = content.replace(/container: \{ flex: 1, backgroundColor: t\.[a-zA-Z]+ \}/g, 'container: { flex: 1, backgroundColor: t.background }');
  
  // Fix imports if needed
  content = content.replace(/import\s*\{\s*,\s*SPACING/g, 'import { SPACING');

  // Also fix STATUS_COLOR dicts that were broken. They should use COLORS, not t. Wait, where is STATUS_COLOR defined?
  // They were like: pending:.secondary, active:.success
  // Oh! Because the node script replaced t. with COLORS. ? No, it just broke.
  // In orders.tsx:
  // const STATUS_COLOR: Record<string, string> = { pending:.secondary, active:.success, completed:.info, cancelled:.danger };
  content = content.replace(/pending:\.secondary/g, 'pending: t.secondary'); // wait, t is not defined here if it's outside component!
  // It's better to move it inside component or pass t.
  
  // To keep it simple, I will replace `pending:.secondary` with `pending: '#F97316'` or something, OR move them inside component.
  // Actually, I'll just change `.secondary` to `'#F97316'`, `.success` to `'#10B981'`, `.info` to `'#3B82F6'`, `.danger` to `'#EF4444'`, `.warning` to `'#F59E0B'`, `.primary` to `'#1E3A8A'`
  
  content = content.replace(/pending:\s*\.secondary/g, "pending: '#F97316'");
  content = content.replace(/active:\s*\.success/g, "active: '#10B981'");
  content = content.replace(/completed:\s*\.info/g, "completed: '#3B82F6'");
  content = content.replace(/cancelled:\s*\.danger/g, "cancelled: '#EF4444'");
  
  content = content.replace(/pending:\s*t\.secondary/g, "pending: '#F97316'");
  content = content.replace(/active:\s*t\.success/g, "active: '#10B981'");
  content = content.replace(/completed:\s*t\.info/g, "completed: '#3B82F6'");
  content = content.replace(/cancelled:\s*t\.danger/g, "cancelled: '#EF4444'");

  fs.writeFileSync(filePath, content);
  console.log('Fixed syntax in', filePath);
});
