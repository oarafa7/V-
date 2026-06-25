/**
 * Book Lab Tests — standalone tab. Browse the admin-managed lab-test packages,
 * select all of a package or individual tests, see prices + totals, then
 * continue into the booking flow to pick a day for the home draw.
 */
import type { LabPackage } from '@vital/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LabPackageList } from '@/components/LabPackageList';
import { LAB_PACKAGES } from '@/constants/lab-packages';
import { colors } from '@/constants/theme';
import { labPackageApi } from '@/lib/api';

export default function BookLabTests() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [packages, setPackages] = useState<LabPackage[] | null>(null);

  useEffect(() => {
    labPackageApi
      .list()
      .then((r) => setPackages(r.lab_packages.length ? r.lab_packages : LAB_PACKAGES))
      .catch(() => setPackages(LAB_PACKAGES));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.obsidian, paddingTop: insets.top + 12 }}>
      <View className="px-5 pb-2">
        <Text className="font-display" style={{ color: colors.white, fontSize: 26 }}>
          Book Extra Lab Tests
        </Text>
      </View>
      {packages === null ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.gold} />
        </View>
      ) : (
        <LabPackageList
          packages={packages}
          submitLabel="Continue to booking"
          note="Choose a full package or pick individual tests. You'll pick a day for your home draw next."
          onSubmit={() => router.push('/booking')}
        />
      )}
    </View>
  );
}
