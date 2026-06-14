/// Booking domain models — mirrors @vital/shared booking types so the Flutter
/// app matches the React Native "Book a Test" flow.

/// A geographic area where home tests can be booked.
class ServiceArea {
  final String id;
  final String name;
  final String city;

  ServiceArea({
    required this.id,
    required this.name,
    required this.city,
  });

  factory ServiceArea.fromJson(Map<String, dynamic> j) => ServiceArea(
        id: j['id'] as String,
        name: (j['name'] as String?) ?? '',
        city: (j['city'] as String?) ?? '',
      );
}

/// A bookable time window with live capacity.
class Slot {
  final String startTime;
  final String endTime;
  final int capacity;
  final int booked;
  final int remaining;

  Slot({
    required this.startTime,
    required this.endTime,
    required this.capacity,
    required this.booked,
    required this.remaining,
  });

  bool get isFull => remaining <= 0;

  factory Slot.fromJson(Map<String, dynamic> j) => Slot(
        startTime: (j['start_time'] as String?) ?? '',
        endTime: (j['end_time'] as String?) ?? '',
        capacity: (j['capacity'] as num?)?.toInt() ?? 0,
        booked: (j['booked'] as num?)?.toInt() ?? 0,
        remaining: (j['remaining'] as num?)?.toInt() ?? 0,
      );
}

/// Availability for a single calendar day.
class DayAvailability {
  final String date;
  final bool isClosed;
  final List<Slot> slots;

  DayAvailability({
    required this.date,
    required this.isClosed,
    required this.slots,
  });

  bool get hasOpenSlot => slots.any((s) => s.remaining > 0);

  factory DayAvailability.fromJson(Map<String, dynamic> j) => DayAvailability(
        date: (j['date'] as String?) ?? '',
        isClosed: (j['is_closed'] as bool?) ?? false,
        slots: ((j['slots'] as List?) ?? const [])
            .cast<Map<String, dynamic>>()
            .map(Slot.fromJson)
            .toList(),
      );
}

/// A user's booking record.
class Booking {
  final String id;
  final String areaName;
  final String date;
  final String startTime;
  final String endTime;
  final String status;
  final String? address;
  final String? notes;

  Booking({
    required this.id,
    required this.areaName,
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.status,
    required this.address,
    required this.notes,
  });

  factory Booking.fromJson(Map<String, dynamic> j) => Booking(
        id: j['id'] as String,
        areaName: (j['area_name'] as String?) ?? '',
        date: (j['date'] as String?) ?? '',
        startTime: (j['start_time'] as String?) ?? '',
        endTime: (j['end_time'] as String?) ?? '',
        status: (j['status'] as String?) ?? '',
        address: j['address'] as String?,
        notes: j['notes'] as String?,
      );
}
