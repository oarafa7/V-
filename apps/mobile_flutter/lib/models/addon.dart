/// Add-on (out-of-plan) marker models — mirrors @vital/shared AddonMarker /
/// AddonOrder so the Flutter app matches the React Native add-on flow.

/// A biomarker a customer can pay to add on top of their plan at checkout.
class AddonMarker {
  final String id;
  final String name;
  final String unit;
  final String categoryId;
  final String categoryName;
  final int priceEgp;

  AddonMarker({
    required this.id,
    required this.name,
    required this.unit,
    required this.categoryId,
    required this.categoryName,
    required this.priceEgp,
  });

  factory AddonMarker.fromJson(Map<String, dynamic> j) => AddonMarker(
        id: j['id'] as String,
        name: (j['name'] as String?) ?? '',
        unit: (j['unit'] as String?) ?? '',
        categoryId: (j['category_id'] as String?) ?? '',
        categoryName: (j['category_name'] as String?) ?? '',
        priceEgp: (j['price_egp'] as num?)?.toInt() ?? 0,
      );
}

class AddonOrderItem {
  final String biomarkerId;
  final String name;
  final int priceEgp;

  AddonOrderItem({required this.biomarkerId, required this.name, required this.priceEgp});

  factory AddonOrderItem.fromJson(Map<String, dynamic> j) => AddonOrderItem(
        biomarkerId: (j['biomarker_id'] as String?) ?? '',
        name: (j['name'] as String?) ?? '',
        priceEgp: (j['price_egp'] as num?)?.toInt() ?? 0,
      );
}

/// A paid (or pending) order for extra markers attached to a booking.
class AddonOrder {
  final String id;
  final String bookingId;
  final String status;
  final int subtotalEgp;
  final int vatEgp;
  final int totalEgp;
  final List<AddonOrderItem> items;

  AddonOrder({
    required this.id,
    required this.bookingId,
    required this.status,
    required this.subtotalEgp,
    required this.vatEgp,
    required this.totalEgp,
    required this.items,
  });

  factory AddonOrder.fromJson(Map<String, dynamic> j) => AddonOrder(
        id: j['id'] as String,
        bookingId: (j['booking_id'] as String?) ?? '',
        status: (j['status'] as String?) ?? '',
        subtotalEgp: (j['subtotal_egp'] as num?)?.toInt() ?? 0,
        vatEgp: (j['vat_egp'] as num?)?.toInt() ?? 0,
        totalEgp: (j['total_egp'] as num?)?.toInt() ?? 0,
        items: ((j['items'] as List?) ?? const [])
            .cast<Map<String, dynamic>>()
            .map(AddonOrderItem.fromJson)
            .toList(),
      );
}

/// Selected add-on marker ids, shared between the add-ons page and booking
/// screen. Cleared once the add-on order is paid.
class AddonSelection {
  static final List<String> selected = [];

  static bool isSelected(String id) => selected.contains(id);
  static void toggle(String id) {
    if (selected.contains(id)) {
      selected.remove(id);
    } else {
      selected.add(id);
    }
  }

  static void clear() => selected.clear();
}
