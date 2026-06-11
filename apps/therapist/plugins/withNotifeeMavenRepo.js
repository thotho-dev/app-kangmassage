const { withProjectBuildGradle } = require('expo/config-plugins');

/**
 * Plugin ini menambahkan local Maven repo ke android/build.gradle
 * agar Notifee AAR (app.notifee:core) bisa di-resolve saat build.
 *
 * Notifee module sendiri sudah punya baris ini di build.gradle-nya:
 *   rootProject.allprojects { maven { url "$notifeeDir/android/libs" } }
 * Tapi sering tidak kepanggil karena timing evaluasi Gradle.
 * Plugin ini memastikan repo-nya ada SEBELUM sub-project dievaluasi.
 */
module.exports = function withNotifeeMavenRepo(config) {
  return withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    if (contents.includes('@notifee/react-native')) {
      console.log('[withNotifeeMavenRepo] Already applied, skipping');
      return config;
    }

    const marker = "maven { url 'https://www.jitpack.io' }";
    if (contents.includes(marker)) {
      config.modResults.contents = contents.replace(
        marker,
        `${marker}\n    maven { url "\${rootDir}/../../../node_modules/@notifee/react-native/android/libs" }`
      );
      console.log('[withNotifeeMavenRepo] Added Notifee local Maven repo');
    }

    return config;
  });
};
