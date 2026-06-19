const config = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|expo-router|expo|@expo|expo-modules-core|react-native-reanimated|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|react-native-maps|@unimodules|unimodules|react-native-webview)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

module.exports = config;
