// Minimal reanimated mock — only what's used in components
const Reanimated = {
  default: {
    View: 'View',
    Text: 'Text',
    createAnimatedComponent: (c: unknown) => c,
    Value: jest.fn(),
    event: jest.fn(),
    add: jest.fn(),
  },
  useSharedValue: (v: unknown) => ({ value: v }),
  useAnimatedStyle: (fn: () => object) => fn(),
  withTiming: (v: unknown) => v,
  withRepeat: (v: unknown) => v,
  withSpring: (v: unknown) => v,
  FadeIn: { duration: () => ({ delay: () => ({}) }) },
  FadeOut: {},
  ZoomIn: { springify: () => ({}) },
  Layout: { springify: () => ({}) },
};

module.exports = Reanimated;
