import { NextRequest, NextResponse } from 'next/server';

const APP_SCHEME = 'kangmassage://callback';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const hasData = searchParams.has('access_token') || searchParams.has('code');

  // Second request: tokens/code in query params — redirect to app via custom scheme
  if (hasData) {
    const params = searchParams.toString();
    return NextResponse.redirect(`${APP_SCHEME}?${params}`, { status: 302 });
  }

  // First request: no query params, tokens only in hash fragment (client-side)
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Redirecting...</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; background: #0F172A; color: #fff;
      text-align: center; padding: 24px;
    }
    p { font-size: 16px; line-height: 1.5; }
    .tap { font-size: 14px; opacity: 0.6; margin-top: 16px; display: none; }
    .visible { display: block; }
  </style>
</head>
<body>
  <div>
    <p>Redirecting to app...</p>
    <p class="tap" id="tapMsg">Tap anywhere to open app</p>
  </div>
  <script>
    var hash = window.location.hash;
    if (hash && hash.length > 1) {
      var params = hash.substring(1);
      var schemeUrl = '${APP_SCHEME}?' + params;

      // Try immediate redirect
      window.location.href = schemeUrl;

      // If blocked by Chrome, wait for user gesture
      setTimeout(function() {
        document.getElementById('tapMsg').classList.add('visible');
        function doRedirect() {
          window.location.href = schemeUrl;
        }
        document.body.addEventListener('touchstart', doRedirect, { once: true });
        document.body.addEventListener('click', doRedirect, { once: true });
      }, 300);
    } else {
      // No hash — maybe already redirected, try fallback
      document.getElementById('tapMsg').textContent = 'Tap to open app';
      document.getElementById('tapMsg').classList.add('visible');
    }
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
