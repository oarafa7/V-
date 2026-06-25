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

  /// Route a user into onboarding only when their profile is essentially blank
  /// (a fresh signup). Once the health profile is set (gender), they can reach
  /// the app even if they skipped/failed the goals step, instead of being
  /// trapped on every sign-in.
  bool get needsOnboarding => gender == null && healthGoals.isEmpty;
}
