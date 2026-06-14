import '../theme/tokens.dart';

double _num(dynamic v) =>
    v == null ? 0 : (v is num ? v.toDouble() : double.tryParse(v.toString()) ?? 0);

/// A biomarker with the user's latest result + computed status (mirrors
/// @vital/shared BiomarkerWithResult).
class Biomarker {
  final String id;
  final String name;
  final String unit;
  final double optimalLow, optimalHigh, normalLow, normalHigh;
  final double? value;
  final BiomarkerStatus status;

  Biomarker({
    required this.id,
    required this.name,
    required this.unit,
    required this.optimalLow,
    required this.optimalHigh,
    required this.normalLow,
    required this.normalHigh,
    required this.value,
    required this.status,
  });

  bool get tested => status != BiomarkerStatus.untested;

  factory Biomarker.fromJson(Map<String, dynamic> j) {
    final res = j['latest_result'] as Map<String, dynamic>?;
    return Biomarker(
      id: j['id'] as String,
      name: j['name'] as String,
      unit: (j['unit'] as String?) ?? '',
      optimalLow: _num(j['optimal_low']),
      optimalHigh: _num(j['optimal_high']),
      normalLow: _num(j['normal_low']),
      normalHigh: _num(j['normal_high']),
      value: res?['value'] == null ? null : _num(res!['value']),
      status: BiomarkerStatus.parse(j['status'] as String?),
    );
  }
}

/// Per-status counts for the dial + breakdown cards.
class StatusCounts {
  final int optimal, suboptimal, alert, untested;
  const StatusCounts(this.optimal, this.suboptimal, this.alert, this.untested);

  int get tested => optimal + suboptimal + alert;
  int get total => tested + untested;

  static StatusCounts from(List<Biomarker> markers) {
    var o = 0, s = 0, a = 0, u = 0;
    for (final m in markers) {
      switch (m.status) {
        case BiomarkerStatus.optimal:
          o++;
        case BiomarkerStatus.suboptimal:
          s++;
        case BiomarkerStatus.alert:
          a++;
        case BiomarkerStatus.untested:
          u++;
      }
    }
    return StatusCounts(o, s, a, u);
  }
}
