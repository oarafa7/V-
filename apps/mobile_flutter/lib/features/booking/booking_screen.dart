import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../models/booking.dart';
import '../../theme/tokens.dart';

/// Book a Test — pick an area, a date, and an open time window. Capacity is live
/// (remaining slots); full windows are disabled. Shows the user's bookings with
/// a cancel action.
class BookingScreen extends ConsumerStatefulWidget {
  const BookingScreen({super.key});

  @override
  ConsumerState<BookingScreen> createState() => _BookingScreenState();
}

String _today() => DateTime.now().toIso8601String().substring(0, 10);

({String wd, String dm}) _fmtDay(String iso) {
  final d = DateTime.tryParse('${iso}T00:00:00Z');
  if (d == null) return (wd: '', dm: '');
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return (wd: weekdays[(d.weekday - 1) % 7], dm: d.day.toString());
}

class _BookingScreenState extends ConsumerState<BookingScreen> {
  List<ServiceArea> _areas = const [];
  String? _areaId;
  List<DayAvailability> _days = const [];
  int _dateIdx = 0;
  List<Booking> _mine = const [];

  bool _loading = true;
  bool _loadingSlots = false;
  bool _booking = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadInitial();
  }

  Future<void> _loadInitial() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiProvider).dio;
      final results = await Future.wait([
        api.get('/areas'),
        api.get('/bookings/me'),
      ]);
      final areas = ((results[0].data['areas'] as List?) ?? const [])
          .cast<Map<String, dynamic>>()
          .map(ServiceArea.fromJson)
          .toList();
      final mine = ((results[1].data['bookings'] as List?) ?? const [])
          .cast<Map<String, dynamic>>()
          .map(Booking.fromJson)
          .toList();
      if (!mounted) return;
      setState(() {
        _areas = areas;
        _mine = mine;
        _areaId = areas.isNotEmpty ? areas.first.id : null;
        _loading = false;
      });
      if (_areaId != null) await _loadAvailability();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Could not load booking.';
      });
    }
  }

  Future<void> _loadAvailability() async {
    final areaId = _areaId;
    if (areaId == null) return;
    setState(() {
      _loadingSlots = true;
      _dateIdx = 0;
    });
    try {
      final r = await ref.read(apiProvider).dio.get(
        '/areas/$areaId/availability',
        queryParameters: {'from': _today(), 'days': 14},
      );
      final days = ((r.data['availability'] as List?) ?? const [])
          .cast<Map<String, dynamic>>()
          .map(DayAvailability.fromJson)
          .toList();
      if (!mounted) return;
      setState(() {
        _days = days;
        _loadingSlots = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _days = const [];
        _loadingSlots = false;
      });
    }
  }

  Future<void> _refreshMine() async {
    try {
      final r = await ref.read(apiProvider).dio.get('/bookings/me');
      final mine = ((r.data['bookings'] as List?) ?? const [])
          .cast<Map<String, dynamic>>()
          .map(Booking.fromJson)
          .toList();
      if (!mounted) return;
      setState(() => _mine = mine);
    } catch (_) {
      // best-effort refresh
    }
  }

  void _selectArea(String id) {
    if (id == _areaId) return;
    setState(() => _areaId = id);
    _loadAvailability();
  }

  Future<void> _book(String date, String startTime, String endTime) async {
    final areaId = _areaId;
    if (areaId == null || _booking) return;
    setState(() => _booking = true);
    try {
      await ref.read(apiProvider).dio.post('/bookings', data: {
        'area_id': areaId,
        'date': date,
        'start_time': startTime,
        'end_time': endTime,
      });
      if (mounted) _snack('Test booked');
      await _loadAvailability();
      await _refreshMine();
    } catch (_) {
      if (mounted) _snack('Could not book');
    } finally {
      if (mounted) setState(() => _booking = false);
    }
  }

  Future<void> _cancel(String id) async {
    try {
      await ref.read(apiProvider).dio.post('/bookings/$id/cancel');
      if (mounted) _snack('Booking cancelled');
      await _refreshMine();
      await _loadAvailability();
    } catch (_) {
      if (mounted) _snack('Could not cancel');
    }
  }

  void _snack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg, style: bodyText(13, color: T.canvas))),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: T.canvas,
      appBar: AppBar(
        backgroundColor: T.canvas,
        elevation: 0,
        foregroundColor: T.ink,
        leading: const BackButton(color: T.ink),
        title: Text('Book a Test', style: display(20, color: T.ink)),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: T.accent));
    }
    if (_areas.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.place_outlined, size: 40, color: T.inkMuted),
              const SizedBox(height: 8),
              Text('No areas yet', style: display(20, color: T.ink)),
              const SizedBox(height: 4),
              Text(
                _error ?? "Home test booking isn't available in your region yet.",
                textAlign: TextAlign.center,
                style: bodyText(13, color: T.inkSoft),
              ),
            ],
          ),
        ),
      );
    }

    final mineBooked = _mine.where((b) => b.status == 'booked').toList();

    return ListView(
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        if (mineBooked.isNotEmpty) ...[
          const SizedBox(height: 8),
          _label('Your bookings'),
          for (final b in mineBooked) _BookingCard(b, onCancel: () => _cancel(b.id)),
          const SizedBox(height: 8),
        ],
        _label('Area'),
        SizedBox(
          height: 40,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: _areas.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (_, i) {
              final a = _areas[i];
              return _AreaChip(a, selected: a.id == _areaId, onTap: () => _selectArea(a.id));
            },
          ),
        ),
        const SizedBox(height: 16),
        if (_loadingSlots)
          const Padding(
            padding: EdgeInsets.only(top: 24),
            child: Center(child: CircularProgressIndicator(color: T.accent)),
          )
        else
          ..._buildSlots(),
      ],
    );
  }

  List<Widget> _buildSlots() {
    if (_days.isEmpty) {
      return [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
          child: Text('No availability for this area.',
              style: bodyText(14, color: T.inkSoft)),
        ),
      ];
    }

    final selectedDay = (_dateIdx >= 0 && _dateIdx < _days.length) ? _days[_dateIdx] : null;

    return [
      SizedBox(
        height: 64,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          itemCount: _days.length,
          separatorBuilder: (_, __) => const SizedBox(width: 8),
          itemBuilder: (_, i) {
            final d = _days[i];
            return _DateChip(
              d,
              selected: i == _dateIdx,
              onTap: () => setState(() => _dateIdx = i),
            );
          },
        ),
      ),
      const SizedBox(height: 16),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: _buildSlotList(selectedDay),
      ),
    ];
  }

  Widget _buildSlotList(DayAvailability? day) {
    if (day == null || day.slots.isEmpty) {
      return Padding(
        padding: const EdgeInsets.only(top: 8),
        child: Text(
          (day?.isClosed ?? false) ? 'Closed on this date.' : 'No windows available on this date.',
          style: bodyText(14, color: T.inkSoft),
        ),
      );
    }
    return Column(
      children: [
        for (final s in day.slots)
          _SlotCard(
            s,
            disabled: s.isFull || _booking,
            onTap: () => _book(day.date, s.startTime, s.endTime),
          ),
      ],
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
        child: Text(
          text.toUpperCase(),
          style: bodyText(11, weight: FontWeight.w600, color: T.accent).copyWith(letterSpacing: 1.5),
        ),
      );
}

class _BookingCard extends StatelessWidget {
  final Booking booking;
  final VoidCallback onCancel;
  const _BookingCard(this.booking, {required this.onCancel});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: T.panel,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: T.line),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${booking.areaName} · ${booking.date}', style: bodyText(14, color: T.ink)),
                const SizedBox(height: 2),
                Text('${booking.startTime} – ${booking.endTime}', style: bodyText(12, color: T.inkMuted)),
              ],
            ),
          ),
          TextButton(
            onPressed: onCancel,
            child: Text('Cancel', style: bodyText(13, weight: FontWeight.w600, color: T.rust)),
          ),
        ],
      ),
    );
  }
}

class _AreaChip extends StatelessWidget {
  final ServiceArea area;
  final bool selected;
  final VoidCallback onTap;
  const _AreaChip(this.area, {required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: selected ? T.accent : T.panel,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: selected ? T.accent : T.line),
        ),
        child: Text(
          area.name,
          style: bodyText(13, weight: FontWeight.w500, color: selected ? T.canvas : T.ink),
        ),
      ),
    );
  }
}

class _DateChip extends StatelessWidget {
  final DayAvailability day;
  final bool selected;
  final VoidCallback onTap;
  const _DateChip(this.day, {required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final open = day.hasOpenSlot;
    final fmt = _fmtDay(day.date);
    return Opacity(
      opacity: open ? 1 : 0.45,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 54,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected ? T.accent : T.panel,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: selected ? T.accent : T.line),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(fmt.wd, style: bodyText(11, color: selected ? T.canvas : T.inkMuted)),
              const SizedBox(height: 2),
              Text(fmt.dm, style: display(18, color: selected ? T.canvas : T.ink)),
            ],
          ),
        ),
      ),
    );
  }
}

class _SlotCard extends StatelessWidget {
  final Slot slot;
  final bool disabled;
  final VoidCallback onTap;
  const _SlotCard(this.slot, {required this.disabled, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final full = slot.isFull;
    return Opacity(
      opacity: full ? 0.55 : 1,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: GestureDetector(
          onTap: disabled ? null : onTap,
          child: Container(
            padding: const EdgeInsets.all(16),
            constraints: const BoxConstraints(minHeight: 56),
            decoration: BoxDecoration(
              color: full ? T.panel : T.card,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: full ? T.line : T.accent),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('${slot.startTime} – ${slot.endTime}', style: display(16, color: T.ink)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: full ? T.rust.withOpacity(0.15) : T.green.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    full ? 'Full' : '${slot.remaining} left',
                    style: bodyText(12, weight: FontWeight.w500, color: full ? T.rust : T.greenInk),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
