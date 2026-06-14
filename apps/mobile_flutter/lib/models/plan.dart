/// A subscription plan — mirrors the API `serializePlan` shape
/// ({id, name, price_egp, price_display, annual_tests_count, biomarker_count,
/// features, is_active}).
class Plan {
  final String id;
  final String name;
  final String priceDisplay;
  final int priceEgp;
  final int annualTestsCount;
  final int biomarkerCount;
  final List<String> features;
  final bool isActive;

  const Plan({
    required this.id,
    required this.name,
    required this.priceDisplay,
    required this.priceEgp,
    required this.annualTestsCount,
    required this.biomarkerCount,
    required this.features,
    required this.isActive,
  });

  /// True for the higher tier — gets the accent border on the plans screen.
  bool get isPremium => name.toLowerCase() == 'premium';

  factory Plan.fromJson(Map<String, dynamic> j) => Plan(
        id: j['id'] as String,
        name: (j['name'] as String?) ?? '',
        priceDisplay: (j['price_display'] as String?) ?? '',
        priceEgp: (j['price_egp'] as num?)?.toInt() ?? 0,
        annualTestsCount: (j['annual_tests_count'] as num?)?.toInt() ?? 0,
        biomarkerCount: (j['biomarker_count'] as num?)?.toInt() ?? 0,
        features: ((j['features'] as List?) ?? const [])
            .map((e) => e.toString())
            .toList(),
        isActive: (j['is_active'] as bool?) ?? true,
      );
}
