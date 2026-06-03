/**
 * Biomarker Library — category overview cards, search, category + status
 * filters, sort, and a grid/list of biomarker cards. Gated behind an active
 * subscription.
 */
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilterPills, type PillOption } from '@/components/biomarker/FilterPills';
import {
  BiomarkerCard,
  CategoryCard,
  EmptyState,
  LucideIcon,
  SectionHeader,
  SkeletonList,
} from '@/components/ui';
import { colors } from '@/constants/theme';
import {
  filterBiomarkers,
  sortBiomarkers,
  summariseByCategory,
} from '@/lib/library-select';
import { useBiomarkerStore, type SortKey, type StatusFilter } from '@/lib/store/biomarkers';
import { useLibraryStore } from '@/lib/store/library';
import { useSubscriptionStore } from '@/lib/store/subscription';

const STATUS_OPTIONS: PillOption[] = [
  { value: 'all', label: 'All' },
  { value: 'optimal', label: 'Optimal', color: colors.green },
  { value: 'suboptimal', label: 'Review', color: colors.gold },
  { value: 'alert', label: 'Alert', color: colors.red },
  { value: 'untested', label: 'Untested', color: colors.textMuted },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'category', label: 'Category' },
  { value: 'name', label: 'Name' },
  { value: 'last_tested', label: 'Last tested' },
  { value: 'status', label: 'Status' },
];

export default function BiomarkersTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const hasActive = useSubscriptionStore((s) => s.hasActive);
  const subLoaded = useSubscriptionStore((s) => s.loaded);

  const { biomarkers, categories, loaded, loading, error, fetch } = useLibraryStore();
  const ui = useBiomarkerStore();
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    if (hasActive()) void fetch();
  }, [hasActive, fetch]);

  const summaries = useMemo(() => summariseByCategory(biomarkers), [biomarkers]);

  const visible = useMemo(() => {
    const filtered = filterBiomarkers(biomarkers, {
      category: ui.category,
      status: ui.status,
      search: ui.search,
    });
    return sortBiomarkers(filtered, ui.sort);
  }, [biomarkers, ui.category, ui.status, ui.search, ui.sort]);

  const categoryPills: PillOption[] = useMemo(
    () => [
      { value: 'all', label: 'All' },
      ...categories.map((c) => ({ value: c.slug, label: c.name, color: c.color })),
    ],
    [categories],
  );

  // ── Subscription gate ──
  if (subLoaded && !hasActive()) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.obsidian, paddingTop: insets.top }}>
        <EmptyState
          icon="Lock"
          title="Unlock your biomarkers"
          message="An active VITAL subscription gives you access to 80+ biomarkers, optimal ranges, and longitudinal tracking."
          ctaLabel="View Plans"
          onCta={() => router.push('/subscription/plans')}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.obsidian }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-5">
          <Text className="font-display" style={{ color: colors.white, fontSize: 32 }}>
            Biomarkers
          </Text>
        </View>

        {/* Category overview row */}
        {categories.length > 0 ? (
          <View className="mt-5">
            <View className="px-5">
              <SectionHeader title="Categories" />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {categories.map((c) => {
                const s = summaries[c.slug];
                return (
                  <CategoryCard
                    key={c.id}
                    name={c.name}
                    icon={c.icon}
                    color={c.color}
                    total={s?.total ?? 0}
                    optimal={s?.optimal ?? 0}
                    review={s?.suboptimal ?? 0}
                    onPress={() => router.push(`/biomarker/category/${c.slug}`)}
                  />
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Search */}
        <View className="mt-6 px-5">
          <View
            className="flex-row items-center rounded-md border px-3"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <LucideIcon name="Search" size={16} color={colors.textDim} />
            <TextInput
              value={ui.search}
              onChangeText={ui.setSearch}
              placeholder="Search name, description, tags"
              placeholderTextColor={colors.textMuted}
              className="ml-2 flex-1 py-3 font-body"
              style={{ color: colors.white, fontSize: 14 }}
            />
            {ui.search ? (
              <Pressable onPress={() => ui.setSearch('')} hitSlop={8}>
                <LucideIcon name="X" size={16} color={colors.textDim} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Category pills */}
        <View className="mt-4 px-5">
          <FilterPills options={categoryPills} value={ui.category} onChange={ui.setCategory} />
        </View>

        {/* Status filter + view + sort */}
        <View className="mt-3 px-5">
          <FilterPills
            options={STATUS_OPTIONS}
            value={ui.status}
            onChange={(v) => ui.setStatus(v as StatusFilter)}
          />
        </View>

        <View className="mt-3 flex-row items-center justify-between px-5">
          <Pressable
            className="flex-row items-center"
            onPress={() => setSortOpen((o) => !o)}
            hitSlop={8}
          >
            <LucideIcon name="ArrowUpDown" size={14} color={colors.textDim} />
            <Text className="ml-1.5 font-mono" style={{ color: colors.textDim, fontSize: 12 }}>
              {SORT_OPTIONS.find((s) => s.value === ui.sort)?.label}
            </Text>
          </Pressable>
          <Pressable onPress={ui.toggleView} hitSlop={8}>
            <LucideIcon
              name={ui.view === 'grid' ? 'List' : 'LayoutGrid'}
              size={18}
              color={colors.textDim}
            />
          </Pressable>
        </View>

        {sortOpen ? (
          <View className="mt-2 px-5">
            <View className="rounded-md border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              {SORT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  className="flex-row items-center justify-between px-4 py-3"
                  onPress={() => {
                    ui.setSort(opt.value);
                    setSortOpen(false);
                  }}
                >
                  <Text className="font-body" style={{ color: colors.text, fontSize: 14 }}>
                    {opt.label}
                  </Text>
                  {ui.sort === opt.value ? (
                    <LucideIcon name="Check" size={16} color={colors.gold} />
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* List / grid */}
        <View className="mt-4 px-5">
          {loading && !loaded ? (
            <SkeletonList count={8} />
          ) : error ? (
            <EmptyState
              icon="TriangleAlert"
              title="Couldn't load biomarkers"
              message={error}
              ctaLabel="Retry"
              onCta={() => fetch(true)}
            />
          ) : visible.length === 0 ? (
            <EmptyState
              icon="SearchX"
              title="No biomarkers found"
              message="Try clearing filters or your search term."
            />
          ) : ui.view === 'grid' ? (
            <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
              {visible.map((b) => (
                <View key={b.id} style={{ width: '50%' }}>
                  <BiomarkerCard
                    biomarker={b}
                    view="grid"
                    highlight={ui.search}
                    onPress={() => router.push(`/biomarker/${b.id}`)}
                  />
                </View>
              ))}
            </View>
          ) : (
            visible.map((b) => (
              <BiomarkerCard
                key={b.id}
                biomarker={b}
                view="list"
                highlight={ui.search}
                onPress={() => router.push(`/biomarker/${b.id}`)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
