/**
 * Book a Test — pick an area, a date, and an open time window. Capacity is live
 * (remaining slots); full windows are disabled. Shows the user's bookings with
 * cancel.
 */
import type { Booking, DayAvailability, ServiceArea } from '@vital/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, LucideIcon, toast } from '@/components/ui';
import { colors } from '@/constants/theme';
import { ApiError, bookingApi } from '@/lib/api';

const today = () => new Date().toISOString().slice(0, 10);
const fmtDay = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return { wd: d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }), dm: d.getUTCDate() };
};

export default function BookTest() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [days, setDays] = useState<DayAvailability[]>([]);
  const [dateIdx, setDateIdx] = useState(0);
  const [mine, setMine] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    Promise.all([bookingApi.areas(), bookingApi.mine()])
      .then(([a, b]) => {
        setAreas(a.areas);
        setMine(b.bookings);
        if (a.areas.length) setAreaId(a.areas[0]!.id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!areaId) return;
    setLoadingSlots(true);
    setDateIdx(0);
    bookingApi
      .availability(areaId, today(), 14)
      .then((r) => setDays(r.availability))
      .catch(() => setDays([]))
      .finally(() => setLoadingSlots(false));
  }, [areaId]);

  const refreshMine = () => bookingApi.mine().then((r) => setMine(r.bookings)).catch(() => {});

  const book = async (date: string, startTime: string, endTime: string) => {
    if (!areaId || booking) return;
    setBooking(true);
    try {
      await bookingApi.book({ area_id: areaId, date, start_time: startTime, end_time: endTime });
      toast.success('Test booked');
      const r = await bookingApi.availability(areaId, today(), 14);
      setDays(r.availability);
      void refreshMine();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not book');
    } finally {
      setBooking(false);
    }
  };

  const cancel = async (id: string) => {
    try {
      await bookingApi.cancel(id);
      toast.success('Booking cancelled');
      void refreshMine();
      if (areaId) bookingApi.availability(areaId, today(), 14).then((r) => setDays(r.availability)).catch(() => {});
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not cancel');
    }
  };

  const selectedDay = days[dateIdx];

  return (
    <View style={{ flex: 1, backgroundColor: colors.obsidian, paddingTop: insets.top + 12 }}>
      <View className="flex-row items-center px-4 pb-3" style={{ gap: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <LucideIcon name="ChevronLeft" size={24} color={colors.white} />
        </Pressable>
        <Text className="font-display" style={{ color: colors.white, fontSize: 22 }}>Book a Test</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.gold} /></View>
      ) : areas.length === 0 ? (
        <View className="flex-1 px-5">
          <EmptyState icon="MapPin" title="No areas yet" message="Home test booking isn't available in your region yet." />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          {/* My bookings */}
          {mine.filter((b) => b.status === 'booked').length > 0 ? (
            <View className="mb-4 px-5">
              <Text className="mb-2 font-mono uppercase tracking-widest" style={{ color: colors.gold, fontSize: 11 }}>Your bookings</Text>
              {mine.filter((b) => b.status === 'booked').map((b) => (
                <View key={b.id} className="mb-2 flex-row items-center justify-between rounded-lg border p-3" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                  <View>
                    <Text className="font-body" style={{ color: colors.white, fontSize: 14 }}>{b.area_name} · {b.date}</Text>
                    <Text className="font-mono" style={{ color: colors.textDim, fontSize: 12 }}>{b.start_time}–{b.end_time}</Text>
                  </View>
                  <Pressable onPress={() => cancel(b.id)}><Text className="font-body" style={{ color: colors.red, fontSize: 13 }}>Cancel</Text></Pressable>
                </View>
              ))}
            </View>
          ) : null}

          {/* Area chips */}
          <Text className="mb-2 px-5 font-mono uppercase tracking-widest" style={{ color: colors.gold, fontSize: 11 }}>Area</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }} className="mb-4">
            {areas.map((a) => {
              const sel = a.id === areaId;
              return (
                <Pressable key={a.id} onPress={() => setAreaId(a.id)} className="rounded-full border px-4 py-2" style={{ backgroundColor: sel ? colors.gold : colors.surface, borderColor: sel ? colors.gold : colors.border }}>
                  <Text className="font-body" style={{ color: sel ? colors.obsidian : colors.text, fontSize: 13 }}>{a.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {loadingSlots ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: 20 }} />
          ) : (
            <>
              {/* Date strip */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }} className="mb-4">
                {days.map((d, i) => {
                  const sel = i === dateIdx;
                  const open = d.slots.some((s) => s.remaining > 0);
                  const { wd, dm } = fmtDay(d.date);
                  return (
                    <Pressable key={d.date} onPress={() => setDateIdx(i)} className="items-center rounded-lg border px-3 py-2" style={{ backgroundColor: sel ? colors.gold : colors.surface, borderColor: sel ? colors.gold : colors.border, opacity: open ? 1 : 0.45, minWidth: 52 }}>
                      <Text className="font-body" style={{ color: sel ? colors.obsidian : colors.textDim, fontSize: 11 }}>{wd}</Text>
                      <Text className="font-display" style={{ color: sel ? colors.obsidian : colors.white, fontSize: 18 }}>{dm}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Slots for the selected date */}
              <View className="px-5">
                {!selectedDay || selectedDay.slots.length === 0 ? (
                  <Text className="mt-4 font-body" style={{ color: colors.textDim, fontSize: 14 }}>
                    {selectedDay?.is_closed ? 'Closed on this date.' : 'No windows available on this date.'}
                  </Text>
                ) : (
                  selectedDay.slots.map((s) => {
                    const full = s.remaining <= 0;
                    return (
                      <Pressable
                        key={s.start_time}
                        disabled={full || booking}
                        onPress={() => book(selectedDay.date, s.start_time, s.end_time)}
                        className="mb-2 flex-row items-center justify-between rounded-lg border p-4"
                        style={{ backgroundColor: full ? colors.surface : colors.deep, borderColor: full ? colors.border : colors.gold, opacity: full ? 0.55 : 1, minHeight: 56 }}
                      >
                        <Text className="font-display" style={{ color: colors.white, fontSize: 16 }}>{s.start_time} – {s.end_time}</Text>
                        <View
                          className="rounded-full px-2.5 py-1"
                          style={{ backgroundColor: full ? `${colors.red}18` : `${colors.green}18` }}
                        >
                          <Text className="font-body" style={{ color: full ? colors.red : colors.greenInk, fontSize: 12, fontWeight: '500' }}>
                            {full ? 'Full' : `${s.remaining} left`}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}
