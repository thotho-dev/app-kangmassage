const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Plugin ini menambahkan foregroundServiceType "dataSync" ke Notifee's
 * ForegroundService agar FG service bisa berjalan lebih dari ~3 menit
 * di Android 14+ (tanpa di-terminate oleh shortService timeout).
 *
 * Notifee AAR asli hanya declare: android:foregroundServiceType="shortService"
 * Plugin ini mengubahnya menjadi: "dataSync,shortService"
 */
module.exports = function withNotifeeExtendedFgType(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    const services = mainApplication.service || [];

    const fgService = services.find(
      (s) => s.$['android:name'] === 'app.notifee.core.ForegroundService'
    );

    if (fgService) {
      const currentType = fgService.$['android:foregroundServiceType'] || '';
      const types = currentType.split(',').map((t) => t.trim()).filter(Boolean);

      if (!types.includes('dataSync')) {
        types.push('dataSync');
        fgService.$['android:foregroundServiceType'] = types.join(',');
        console.log('[withNotifeeExtendedFgType] Added dataSync to ForegroundService');
      }
    }

    return config;
  });
};
