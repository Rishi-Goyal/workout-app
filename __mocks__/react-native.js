/**
 * Minimal react-native mock for Jest (node test environment).
 * Only exports what is imported by the store/lib layer under test.
 */
module.exports = {
  NativeModules: {},
  Platform: {
    OS: 'android',
    select: (obj) => {
      if (obj && typeof obj === 'object') {
        return obj.android ?? obj.default ?? null;
      }
      return null;
    },
  },
};
