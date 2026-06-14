double _n(dynamic v) => v == null ? 0 : (v is num ? v.toDouble() : double.tryParse(v.toString()) ?? 0);
int? _ni(dynamic v) => v == null ? null : (v is num ? v.toInt() : int.tryParse(v.toString()));

class ScoreDriver {
  final String name;
  final String category;
  final int score;
  ScoreDriver(this.name, this.category, this.score);
  factory ScoreDriver.fromJson(Map<String, dynamic> j) =>
      ScoreDriver((j['name'] as String?) ?? '', (j['category'] as String?) ?? '', _n(j['score']).round());
}

class VitalScore {
  final int score;
  final String band;
  final int testedCount;
  final int totalCount;
  final int confidence;
  final int? cardiometabolic;
  final int? longevity;
  final int? biologicalAge;
  final int? chronologicalAge;
  final int? ageDelta;
  final List<ScoreDriver> negative;
  final List<ScoreDriver> positive;

  VitalScore({
    required this.score,
    required this.band,
    required this.testedCount,
    required this.totalCount,
    required this.confidence,
    required this.cardiometabolic,
    required this.longevity,
    required this.biologicalAge,
    required this.chronologicalAge,
    required this.ageDelta,
    required this.negative,
    required this.positive,
  });

  factory VitalScore.fromJson(Map<String, dynamic> j) {
    final drivers = (j['drivers'] as Map<String, dynamic>?) ?? const {};
    List<ScoreDriver> ds(String k) => ((drivers[k] as List?) ?? const [])
        .cast<Map<String, dynamic>>()
        .map(ScoreDriver.fromJson)
        .toList();
    return VitalScore(
      score: _n(j['score']).round(),
      band: (j['band'] as String?) ?? '',
      testedCount: _n(j['tested_count']).round(),
      totalCount: _n(j['total_count']).round(),
      confidence: _n(j['confidence']).round(),
      cardiometabolic: _ni(j['cardiometabolic_score']),
      longevity: _ni(j['longevity_score']),
      biologicalAge: _ni(j['biological_age']),
      chronologicalAge: _ni(j['chronological_age']),
      ageDelta: _ni(j['age_delta']),
      negative: ds('negative'),
      positive: ds('positive'),
    );
  }
}

class ScorePoint {
  final int score;
  final String recordedOn;
  ScorePoint(this.score, this.recordedOn);
  factory ScorePoint.fromJson(Map<String, dynamic> j) =>
      ScorePoint(_n(j['score']).round(), (j['recorded_on'] as String?) ?? '');
}
