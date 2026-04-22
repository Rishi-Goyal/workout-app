/**
 * CornerBrackets — four L-shaped border fragments placed at a parent's corners.
 * Renders the "framing" ornament used on hero cards + quest cards in the
 * Solo Leveling design language. Parent must be position: relative (or unset
 * — ours are inside a View tree that defaults to relative anyway).
 *
 * Usage:
 *   <View style={{ position: 'relative' }}>
 *     <CornerBrackets color={COLORS.gold} />
 *     ...card body...
 *   </View>
 */
import { View, type ColorValue } from 'react-native';
import { COLORS } from '@/lib/constants';

interface CornerBracketsProps {
  color?: ColorValue;
  /** Size of each L arm (default 14). */
  size?: number;
  /** Stroke thickness (default 2). */
  thickness?: number;
  /** Pull brackets outward from edge (default 0 — flush with corner). */
  inset?: number;
}

export default function CornerBrackets({
  color = COLORS.gold,
  size = 14,
  thickness = 2,
  inset = 0,
}: CornerBracketsProps) {
  // Each corner is drawn as two absolutely-positioned thin rectangles
  // (top/bottom edge + left/right edge).
  const arms = [
    // Top-left
    { top: inset,    left: inset,  w: size,      h: thickness }, // horizontal
    { top: inset,    left: inset,  w: thickness, h: size      }, // vertical
    // Top-right
    { top: inset,    right: inset, w: size,      h: thickness },
    { top: inset,    right: inset, w: thickness, h: size      },
    // Bottom-left
    { bottom: inset, left: inset,  w: size,      h: thickness },
    { bottom: inset, left: inset,  w: thickness, h: size      },
    // Bottom-right
    { bottom: inset, right: inset, w: size,      h: thickness },
    { bottom: inset, right: inset, w: thickness, h: size      },
  ];
  return (
    <>
      {arms.map((a, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: a.top,
            bottom: a.bottom,
            left: a.left,
            right: a.right,
            width: a.w,
            height: a.h,
            backgroundColor: color,
          }}
        />
      ))}
    </>
  );
}
