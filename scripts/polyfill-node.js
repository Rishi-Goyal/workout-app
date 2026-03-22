/**
 * Polyfills Node 20+ APIs used by Expo SDK 55 so the dev server can run on Node 18.
 * Inject with: node -r ./scripts/polyfill-node.js
 */
const util = require('util');

// util.parseEnv — added in Node 20.13.0. Used by @expo/env to parse .env files.
if (typeof util.parseEnv !== 'function') {
  util.parseEnv = function parseEnv(content) {
    const result = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      result[key] = value;
    }
    return result;
  };
}

// Array.prototype.toReversed — added in Node 20. Returns a new reversed array.
if (typeof Array.prototype.toReversed !== 'function') {
  Array.prototype.toReversed = function toReversed() {
    return [...this].reverse();
  };
}

// Array.prototype.toSorted — added in Node 20. Returns a new sorted array.
if (typeof Array.prototype.toSorted !== 'function') {
  Array.prototype.toSorted = function toSorted(compareFn) {
    return [...this].sort(compareFn);
  };
}

// Array.prototype.toSpliced — added in Node 20.
if (typeof Array.prototype.toSpliced !== 'function') {
  Array.prototype.toSpliced = function toSpliced(start, deleteCount, ...items) {
    const copy = [...this];
    copy.splice(start, deleteCount, ...items);
    return copy;
  };
}

// Array.prototype.with — added in Node 20.
if (typeof Array.prototype.with !== 'function') {
  Array.prototype.with = function withMethod(index, value) {
    const copy = [...this];
    copy[index < 0 ? this.length + index : index] = value;
    return copy;
  };
}
