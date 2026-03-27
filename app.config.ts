import type { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Dynamic Expo config — driven by the APP_ENV environment variable.
 *
 * APP_ENV=development  → debug build, "(Dev)" suffix, dev API key
 * APP_ENV=staging      → debug build, "(Staging)" suffix, staging API key
 * APP_ENV=production   → release build, no suffix, prod API key
 *
 * Set APP_ENV in .env.local for local work, or in the CI environment for builds.
 */

type AppEnv = 'development' | 'staging' | 'production';

const APP_ENV = (process.env.APP_ENV ?? 'development') as AppEnv;

const envConfig: Record<AppEnv, {
  appName: string;
  packageSuffix: string;
  icon: string;
}> = {
  development: {
    appName: 'DungeonFit (Dev)',
    packageSuffix: '.dev',
    icon: './assets/icon.png',
  },
  staging: {
    appName: 'DungeonFit (Staging)',
    packageSuffix: '.staging',
    icon: './assets/icon.png',
  },
  production: {
    appName: 'DungeonFit',
    packageSuffix: '',
    icon: './assets/icon.png',
  },
};

const { appName, packageSuffix, icon } = envConfig[APP_ENV];
const BASE_PACKAGE = 'com.anonymous.dungeonfit';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appName,
  slug: 'dungeonfit',
  version: '2.0.0',
  orientation: 'portrait',
  icon,
  userInterfaceStyle: 'dark',
  backgroundColor: '#0d0a0e',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0d0a0e',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: `${BASE_PACKAGE}${packageSuffix}`,
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#0d0a0e',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    package: `${BASE_PACKAGE}${packageSuffix}`,
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: ['expo-router'],
  scheme: 'dungeonfit',
  extra: {
    // Accessible at runtime via Constants.expoConfig.extra.appEnv
    appEnv: APP_ENV,
  },
});
