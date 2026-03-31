## 2026-03-29 - Missing ARIA on custom React Native touchables
**Learning:** Custom interactive elements in React Native built with `TouchableOpacity` or `Pressable` often lack semantic meaning by default, unlike HTML `<button>` tags. This creates accessibility barriers for screen reader users, especially for icon-only buttons (like steppers) or buttons acting as toggles.
**Action:** Always verify custom touchables have `accessibilityRole="button"` and an `accessibilityLabel`. If the button's purpose isn't fully clear from the label, add an `accessibilityHint`.
