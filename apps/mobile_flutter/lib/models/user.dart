class AppUser {
  final String id;
  final String email;
  final String fullName;
  final String? gender;
  final String? dateOfBirth;
  final List<String> healthGoals;

  AppUser({
    required this.id,
    required this.email,
    required this.fullName,
    required this.gender,
    required this.dateOfBirth,
    required this.healthGoals,
  });

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
        id: j['id'] as String,
        email: (j['email'] as String?) ?? '',
        fullName: (j['full_name'] as String?) ?? '',
        gender: j['gender'] as String?,
        dateOfBirth: j['date_of_birth'] as String?,
        healthGoals: ((j['health_goals'] as List?) ?? const []).map((e) => e.toString()).toList(),
      );

  String get firstName => fullName.split(' ').first;

  /// New users haven't completed onboarding until they've picked health goals.
  bool get needsOnboarding => healthGoals.isEmpty;
}
