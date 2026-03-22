/** @type {import('jest').Config} */
const config = {
  // Node environment — our tests exercise pure TS logic and Zustand stores,
  // none of which require a React Native / JSDOM environment.
  testEnvironment: 'node',

  // Use babel-jest with our custom babel.config.js (test branch: plain presets,
  // no Expo/Reanimated plugins that require native tool-chains).
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },

  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],

  moduleNameMapper: {
    // Resolve @/ path alias → src/
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Don't transform anything in node_modules — all deps we use ship CJS.
  transformIgnorePatterns: ['node_modules/'],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};

module.exports = config;
