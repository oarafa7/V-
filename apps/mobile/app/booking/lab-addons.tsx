/**
 * Add-on Lab Tests — shown right after the customer picks their package test
 * day. Same grouped package selector as the Book Lab Tests tab; here it adds
 * tests onto the booking that was just made.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LabPackageList } from '@/components/LabPackageList';
import { LucideIcon, toast } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useLabPackageStore } from '@/lib/store/lab-packages';

export default function LabAddons() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const clear = useLabPackageStore((s) => s.clear);

  const skip = () => {
    clear();
    router.replace('/(tabs)/dashboard');
  };

  const confirm = (ids: string[]) => {
    // Selection is captured; wire to the add-on order/payment endpoint here.
    toast.success(`${ids.length} add-on ${ids.length === 1 ? 'test' : 'tests'} added to your booking`);
    clear();
    router.replace('/(tabs)/dashboard');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.obsidian, paddingTop: insets.top + 12 }}>
      <View className="flex-row items-center justify-between px-5 pb-2">
        <View style={{ flex: 1 }}>
          <Text className="font-mono uppercase tracking-widest" style={{ color: colors.gold, fontSize: 11 }}>
            Test day booked
          </Text>
          <Text className="mt-1 font-display" style={{ color: colors.white, fontSize: 24 }}>
            Add-on Lab Tests
          </Text>
        </View>
        <Pressable onPress={skip} hitSlop={10} className="flex-row items-center" style={{ gap: 4 }}>
          <Text className="font-mono" style={{ color: colors.textMuted, fontSize: 12 }}>
            Skip
          </Text>
          <LucideIcon name="ChevronRight" size={16} color={colors.textMuted} />
        </Pressable>
      </View>
      <LabPackageList
        submitLabel="Add to my booking"
        note={
          bookingId
            ? 'Add extra tests to the home draw you just booked — no second visit needed.'
            : 'Add extra tests to your booking.'
        }
        onSubmit={confirm}
      />
    </View>
  );
}
