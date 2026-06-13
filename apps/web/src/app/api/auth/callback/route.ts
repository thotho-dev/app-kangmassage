import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const accessToken = searchParams.get('access_token');

  // Second request: tokens in query params — redirect to app via custom scheme
  if (accessToken) {
    const params = searchParams.toString();
    const appUrl = `kangmassage://auth/callback?${params}`;
    return NextResponse.redirect(appUrl, { status: 302 });
  }

  // First request: no query params, tokens only in hash fragment (client-side)
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0F172A; color: #fff; }
    p { font-size: 16px; }
  </style>
  <script>
    var hash = window.location.hash;
    if (hash && hash.length > 1) {
      var params = hash.substring(1);
      window.location.href = window.location.pathname + '?' + params;
    }
  </script>
</head>
<body>
  <p>Redirecting to app...</p>
  <noscript>
    <meta http-equiv="refresh" content="0;url=kang-massage-customer://auth/callback">
  </noscript>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
