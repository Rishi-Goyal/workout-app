module.exports = function (api) {
  const isTest = api.env('test');

  if (isTest) {
    // Jest: plain Babel presets — no Expo/RN transforms needed because tests
    // only exercise pure TS logic and Zustand stores (no RN components).
    return {
      presets: [
        '@babel/preset-typescript',
        ['@babel/preset-react', { runtime: 'automatic' }],
      ],
      plugins: ['@babel/plugin-transform-modules-commonjs'],
    };
  }

  // Metro (web + native): babel-preset-expo already auto-includes
  // react-native-reanimated/plugin when it detects the package, so we
  // don't add it manually here (that would load it twice).
  return {
    presets: ['babel-preset-expo'],
  };
};
