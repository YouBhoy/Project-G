class StudentEntity {
  final String studentId;
  final String name;
  final String email;
  final String college;
  final int yearLevel;
  final String sex;
  final bool consentFlag;
  final DateTime? createdAt;

  StudentEntity({
    required this.studentId,
    required this.name,
    required this.email,
    required this.college,
    required this.yearLevel,
    required this.sex,
    required this.consentFlag,
    this.createdAt,
  });
}

class AuthEntity {
  final String token;
  final String role;
  final StudentEntity student;

  AuthEntity({
    required this.token,
    required this.role,
    required this.student,
  });
}
