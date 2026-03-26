/**
 * Jest mock for expo-constants.
 * Returns the version from package.json — matches what the real module returns at runtime.
 */
const { version } = require('../package.json');

module.exports = {
  __esModule: true,
  default: {
    expoConfig: { version },
  },
};
