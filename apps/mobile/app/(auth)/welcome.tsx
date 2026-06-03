/**
 * Welcome — branded splash with tagline and the two entry CTAs. A subtle
 * pulsing radial glow stands in for the animated background.
 */
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { colors } from '@/constants/theme';

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pulse = useSharedValue(0.6);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  const glow = useAnimatedStyle(() => ({
    opacity: pulse.value * 0.5,
    transform: [{ scale: 0.9 + pulse.value * 0.2 }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.obsidian }}>
      {/* Pulsing background glow */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: '18%',
            alignSelf: 'center',
            width: 320,
            height: 320,
            borderRadius: 160,
            backgroundColor: colors.goldDim,
          },
          glow,
        ]}
      />

      <View className="flex-1 items-center justify-center px-8">
        <Text className="font-display tracking-widest" style={{ color: colors.gold, fontSize: 64 }}>
          VITAL
        </Text>
        <Text
          className="mt-4 text-center font-body"
          style={{ color: colors.text, fontSize: 18, lineHeight: 26 }}
        >
          Know your body.{'\n'}Before it fails you.
        </Text>
      </View>

      <View className="px-8" style={{ paddingBottom: insets.bottom + 24, gap: 12 }}>
        <Button label="Get Started" onPress={() => router.push('/(auth)/signup')} />
        <Button
          label="Sign In"
          variant="secondary"
          onPress={() => router.push('/(auth)/login')}
        />
      </View>
    </View>
  );
}
