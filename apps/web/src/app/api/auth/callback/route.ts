import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <script>
    var hash = window.location.hash;
    window.location.href = 'kangmassage://auth/callback' + hash;
  </script>
</head>
<body>
  <p>Redirecting to app...</p>
  <noscript>
    <meta http-equiv="refresh" content="0;url=kangmassage://auth/callback">
  </noscript>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
