class RecMarker {
  final String name;
  final String status;
  RecMarker(this.name, this.status);
  factory RecMarker.fromJson(Map<String, dynamic> j) =>
      RecMarker((j['name'] as String?) ?? '', (j['status'] as String?) ?? '');
}

class Recommendation {
  final String name;
  final String category;
  final String summary;
  final String detail;
  final String dosage;
  final String evidenceLevel;
  final String url;
  final List<RecMarker> matched;

  Recommendation({
    required this.name,
    required this.category,
    required this.summary,
    required this.detail,
    required this.dosage,
    required this.evidenceLevel,
    required this.url,
    required this.matched,
  });

  factory Recommendation.fromJson(Map<String, dynamic> j) {
    final iv = (j['intervention'] as Map<String, dynamic>?) ?? const {};
    final matched = ((j['matched'] as List?) ?? const [])
        .cast<Map<String, dynamic>>()
        .map(RecMarker.fromJson)
        .toList();
    return Recommendation(
      name: (iv['name'] as String?) ?? '',
      category: (iv['category'] as String?) ?? '',
      summary: (iv['summary'] as String?) ?? '',
      detail: (iv['detail'] as String?) ?? '',
      dosage: (iv['dosage'] as String?) ?? '',
      evidenceLevel: (iv['evidence_level'] as String?) ?? '',
      url: (iv['url'] as String?) ?? '',
      matched: matched,
    );
  }
}
