/**
 * Book Lab Tests — standalone tab. Browse lab-test packages, select all of a
 * package or individual tests, see prices + totals, then continue into the
 * booking flow to pick a day for the home draw.
 */
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LabPackageList } from '@/components/LabPackageList';
import { colors } from '@/constants/theme';

export default function BookLabTests() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.obsidian, paddingTop: insets.top + 12 }}>
      <View className="px-5 pb-2">
        <Text className="font-display" style={{ color: colors.white, fontSize: 26 }}>
          Book Extra Lab Tests
        </Text>
      </View>
      <LabPackageList
        submitLabel="Continue to booking"
        note="Choose a full package or pick individual tests. You'll pick a day for your home draw next."
        onSubmit={() => router.push('/booking')}
      />
    </View>
  );
}
