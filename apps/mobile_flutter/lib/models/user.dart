class AppUser {
  final String id;
  final String email;
  final String fullName;

  AppUser({required this.id, required this.email, required this.fullName});

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
        id: j['id'] as String,
        email: (j['email'] as String?) ?? '',
        fullName: (j['full_name'] as String?) ?? '',
      );

  String get firstName => fullName.split(' ').first;
}
