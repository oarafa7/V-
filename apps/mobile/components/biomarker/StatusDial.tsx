/**
 * StatusDial — radial gauge of segmented ticks, one per biomarker, colored by
 * status and grouped into arcs (optimal → review → alert → untested). The center
 * shows a count. Pure SVG, works on iOS/Android/web.
 */
import type { BiomarkerStatus } from '@vital/shared';
import { Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { colors, statusColors } from '@/constants/theme';

interface Props {
  counts: { optimal: number; suboptimal: number; alert: number; untested: number };
  size?: number;
  centerValue: number | string;
  centerLabel?: string;
}

// Draw order around the ring (12 o'clock, clockwise).
const ORDER: BiomarkerStatus[] = ['optimal', 'suboptimal', 'alert', 'untested'];

export function StatusDial({ counts, size = 220, centerValue, centerLabel }: Props) {
  // Expand the counts into a per-tick status sequence.
  const segments: BiomarkerStatus[] = ORDER.flatMap((status) =>
    Array.from({ length: counts[status] }, () => status),
  );
  const n = Math.max(segments.length, 1);

  const center = size / 2;
  const outerR = center - 6;
  const tickLen = size * 0.11;
  const innerR = outerR - tickLen;
  // Tick thickness scales with how many fit around the ring (with a small gap).
  const stroke = Math.max(2, Math.min(7, ((2 * Math.PI * outerR) / n) * 0.55));

  const ticks = segments.map((status, i) => {
    const angle = (-90 + (i / n) * 360) * (Math.PI / 180);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x1: center + innerR * cos,
      y1: center + innerR * sin,
      x2: center + outerR * cos,
      y2: center + outerR * sin,
      color: status === 'untested' ? colors.border : statusColors[status],
    };
  });

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size}>
        {ticks.map((t, i) => (
          <Line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.color}
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        ))}
      </Svg>
      <View className="absolute items-center">
        <Text className="font-display" style={{ color: colors.white, fontSize: size * 0.22 }}>
          {centerValue}
        </Text>
        {centerLabel ? (
          <Text
            className="font-mono uppercase tracking-widest"
            style={{ color: colors.textDim, fontSize: 11, marginTop: 2 }}
          >
            {centerLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
