class BiomarkerCategory {
  final String id;
  final String name;
  final String slug;
  final String icon;
  final String color;

  BiomarkerCategory({
    required this.id,
    required this.name,
    required this.slug,
    required this.icon,
    required this.color,
  });

  factory BiomarkerCategory.fromJson(Map<String, dynamic> j) => BiomarkerCategory(
        id: (j['id'] as String?) ?? '',
        name: (j['name'] as String?) ?? '',
        slug: (j['slug'] as String?) ?? '',
        icon: (j['icon'] as String?) ?? '',
        color: (j['color'] as String?) ?? '#6FA97D',
      );
}
