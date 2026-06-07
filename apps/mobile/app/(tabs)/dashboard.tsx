/**
 * Dashboard — at-a-glance overview: greeting, the VITAL Score hero, category
 * summaries, and prompts to subscribe / book a first test.
 */
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryCard, EmptyState, LucideIcon, ScoreHero, SectionHeader } from '@/components/ui';
import { colors } from '@/constants/theme';
import { aiApi } from '@/lib/api';
import { summariseByCategory } from '@/lib/library-select';
import { useAuthStore } from '@/lib/store/auth';
import { useLibraryStore } from '@/lib/store/library';
import { useScoreStore } from '@/lib/store/score';
import { useSubscriptionStore } from '@/lib/store/subscription';

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const hasActive = useSubscriptionStore((s) => s.hasActive);
  const subscription = useSubscriptionStore((s) => s.subscription);
  const subLoaded = useSubscriptionStore((s) => s.loaded);
  const { biomarkers, categories, fetch } = useLibraryStore();
  const score = useScoreStore((s) => s.score);
  const history = useScoreStore((s) => s.history);
  const fetchScore = useScoreStore((s) => s.fetch);
  const [aiEnabled, setAiEnabled] = useState(false);

  useEffect(() => {
    if (hasActive()) {
      void fetch();
      void fetchScore(true);
    }
  }, [hasActive, fetch, fetchScore]);

  useEffect(() => {
    aiApi.status().then((r) => setAiEnabled(r.status.enabled)).catch(() => {});
  }, []);

  const summaries = useMemo(() => summariseByCategory(biomarkers), [biomarkers]);

  const firstName = user?.full_name?.split(' ')[0] ?? 'there';

  return (
    <View style={{ flex: 1, backgroundColor: colors.obsidian }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5">
          <Text className="font-mono uppercase tracking-widest" style={{ color: colors.gold, fontSize: 12 }}>
            Welcome back
          </Text>
          <Text className="mt-1 font-display" style={{ color: colors.white, fontSize: 34 }}>
            {firstName}
          </Text>
        </View>

        {subLoaded && !hasActive() ? (
          <View className="mt-6 px-5">
            <EmptyState
              icon="Sparkles"
              title="Start your health journey"
              message="Subscribe to unlock 80+ biomarkers and begin tracking what matters."
              ctaLabel="View Plans"
              onCta={() => router.push('/subscription/plans')}
            />
          </View>
        ) : (
          <>
            {/* VITAL Score hero */}
            {score ? (
              <View className="mt-6 px-5">
                <ScoreHero score={score} history={history} />
              </View>
            ) : null}

            {/* AI entry */}
            {aiEnabled ? (
              <View className="mt-4 px-5">
                <Pressable
                  onPress={() => router.push('/insights')}
                  className="flex-row items-center rounded-lg border p-4"
                  style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                >
                  <LucideIcon name="Sparkles" size={22} color={colors.gold} />
                  <View className="ml-3 flex-1">
                    <Text className="font-display" style={{ color: colors.white, fontSize: 16 }}>VITAL AI</Text>
                    <Text className="font-body" style={{ color: colors.textDim, fontSize: 12 }}>
                      Insights & answers from your results
                    </Text>
                  </View>
                  <LucideIcon name="ChevronRight" size={20} color={colors.textDim} />
                </Pressable>
              </View>
            ) : null}

            {/* Subscription summary */}
            {subscription ? (
              <View className="mt-4 px-5">
                <View
                  className="rounded-lg border p-4"
                  style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                >
                  <Text className="font-mono uppercase" style={{ color: colors.gold, fontSize: 11 }}>
                    {subscription.plan.name} plan
                  </Text>
                  <Text className="mt-1 font-body" style={{ color: colors.text, fontSize: 13 }}>
                    {subscription.plan.annual_tests_count} tests / year · renews{' '}
                    {new Date(subscription.expires_at).toLocaleDateString('en-GB')}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Category summaries */}
            {categories.length > 0 ? (
              <View className="mt-6">
                <View className="px-5">
                  <SectionHeader
                    title="Categories"
                    actionLabel="See all"
                    onAction={() => router.push('/(tabs)/biomarkers')}
                  />
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
          </>
        )}
      </ScrollView>
    </View>
  );
}
