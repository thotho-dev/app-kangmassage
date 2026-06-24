import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface Props {
  source: any;
  size?: number;
  width?: number;
  height?: number;
  scale?: number;
}

export default function LottieWebView({ source, size = 80, width, height, scale = 1 }: Props) {
  const jsonStr = JSON.stringify(source);
  const origW = source.w || 1;
  const origH = source.h || 1;
  const w = width ?? size;
  const h = height ?? size;
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: transparent; overflow: hidden; }
    body { display: flex; align-items: center; justify-content: center; }
  </style>
</head>
<body>
  <div id="anim"></div>
  <script>
    try {
      var animData = ${jsonStr};
      var origW = animData.w || 1;
      var origH = animData.h || 1;
      var aspect = origW / origH;
      var maxW = ${w};
      var maxH = ${h};
      var dispW, dispH;
      if (maxW / maxH > aspect) {
        dispH = maxH;
        dispW = maxH * aspect;
      } else {
        dispW = maxW;
        dispH = maxW / aspect;
      }
      var el = document.getElementById('anim');
      el.style.width = Math.round(dispW) + 'px';
      el.style.height = Math.round(dispH) + 'px';
      var anim = bodymovin.loadAnimation({
        container: el,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: animData
      });
    } catch(e) { document.body.innerHTML = 'err'; }
  </script>
</body>
</html>`;

  return (
    <View style={{ width: w, height: h, overflow: 'visible', transform: [{ scale }] }}>
      <WebView
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webview: {
    backgroundColor: 'transparent',
    width: '100%',
    height: '100%',
  },
});
