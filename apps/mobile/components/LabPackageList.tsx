/**
 * Grouped lab-test selector. Each package is its own card with a "Select all"
 * control and the package total; every test shows its price and can be ticked
 * individually. A sticky bar shows the running selected total (+14% VAT) and the
 * primary action. Reused by the "Book Lab Tests" tab and the booking add-on step.
 */
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LabPackage } from '@vital/shared';

import { Button, LucideIcon } from '@/components/ui';
import { LAB_PACKAGES, labPackageTestIds, labPackageTotal } from '@/constants/lab-packages';
import { colors } from '@/constants/theme';
import { useLabPackageStore } from '@/lib/store/lab-packages';

const VAT_RATE = 0.14;
const egp = (n: number) => `EGP ${n.toLocaleString('en-US')}`;

export function LabPackageList({
  packages = LAB_PACKAGES,
  submitLabel,
  onSubmit,
  note,
}: {
  packages?: LabPackage[];
  submitLabel: string;
  onSubmit: (selectedIds: string[], total: number) => void;
  note?: string;
}) {
  const insets = useSafeAreaInsets();
  const selected = useLabPackageStore((s) => s.selected);
  const toggle = useLabPackageStore((s) => s.toggle);
  const setMany = useLabPackageStore((s) => s.setMany);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const subtotal = useMemo(() => {
    let sum = 0;
    for (const pkg of packages) {
      for (const t of pkg.tests) if (selectedSet.has(t.id)) sum += t.price_egp;
    }
    return sum;
  }, [packages, selectedSet]);

  const vat = Math.round(subtotal * VAT_RATE);
  const total = subtotal + vat;
  const count = selected.length;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 180 }}
        showsVerticalScrollIndicator={false}
      >
        {note ? (
          <Text className="mb-3 font-body" style={{ color: colors.textDim, fontSize: 13, lineHeight: 19 }}>
            {note}
          </Text>
        ) : null}

        {packages.map((pkg) => {
          const ids = labPackageTestIds(pkg);
          const allOn = ids.every((id) => selectedSet.has(id));
          const someOn = !allOn && ids.some((id) => selectedSet.has(id));
          return (
            <View
              key={pkg.id}
              className="mb-4 rounded-xl border"
              style={{ backgroundColor: colors.surface, borderColor: colors.border, overflow: 'hidden' }}
            >
              {/* Package header — name, full package total, select-all */}
              <View
                className="flex-row items-center justify-between px-4 py-3"
                style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text className="font-display" style={{ color: colors.white, fontSize: 17 }}>
                    {pkg.name}
                  </Text>
                  <Text className="font-mono" style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                    Package total {egp(labPackageTotal(pkg))}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setMany(ids, !allOn)}
                  hitSlop={8}
                  className="flex-row items-center rounded-lg px-2.5 py-1.5"
                  style={{ backgroundColor: allOn ? colors.gold : 'transparent', borderWidth: 1, borderColor: allOn ? colors.gold : colors.border, gap: 6 }}
                >
                  <LucideIcon
                    name={allOn ? 'CheckCheck' : someOn ? 'Minus' : 'Check'}
                    size={14}
                    color={allOn ? colors.obsidian : colors.textDim}
                  />
                  <Text className="font-mono" style={{ color: allOn ? colors.obsidian : colors.textDim, fontSize: 11 }}>
                    Select all
                  </Text>
                </Pressable>
              </View>

              {/* Tests */}
              {pkg.tests.map((t, i) => {
                const on = selectedSet.has(t.id);
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => toggle(t.id)}
                    className="flex-row items-center justify-between px-4 py-3"
                    style={{ borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}
                  >
                    <View className="flex-row items-center" style={{ flex: 1, gap: 12 }}>
                      <View
                        className="items-center justify-center rounded"
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          borderWidth: 1.5,
                          borderColor: on ? colors.gold : colors.border,
                          backgroundColor: on ? colors.gold : 'transparent',
                        }}
                      >
                        {on ? <LucideIcon name="Check" size={14} color={colors.obsidian} /> : null}
                      </View>
                      <Text className="font-body" style={{ color: colors.white, fontSize: 15, flex: 1 }}>
                        {t.name}
                      </Text>
                    </View>
                    <Text className="font-mono" style={{ color: on ? colors.gold : colors.textDim, fontSize: 13 }}>
                      {egp(t.price_egp)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      {/* Sticky total + action */}
      <View
        className="absolute inset-x-0 bottom-0 border-t px-5 pt-3"
        style={{ backgroundColor: colors.deep, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }}
      >
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="font-mono" style={{ color: colors.textMuted, fontSize: 12 }}>
            {count} {count === 1 ? 'test' : 'tests'} · VAT {egp(vat)}
          </Text>
          <Text className="font-display" style={{ color: colors.white, fontSize: 20 }}>
            {egp(total)}
          </Text>
        </View>
        <Button
          label={submitLabel}
          disabled={count === 0}
          onPress={() => onSubmit(selected, total)}
        />
      </View>
    </View>
  );
}
