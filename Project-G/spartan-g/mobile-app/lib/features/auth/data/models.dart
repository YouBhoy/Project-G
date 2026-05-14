class StudentModel {
  final String studentId;
  final String name;
  final String email;
  final String college;
  final int yearLevel;
  final String sex;
  final bool consentFlag;
  final DateTime? createdAt;

  StudentModel({
    required this.studentId,
    required this.name,
    required this.email,
    required this.college,
    required this.yearLevel,
    required this.sex,
    required this.consentFlag,
    this.createdAt,
  });

  factory StudentModel.fromJson(Map<String, dynamic> json) {
    return StudentModel(
      studentId: json['studentId'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      college: json['college'] as String,
      yearLevel: json['yearLevel'] as int,
      sex: json['sex'] as String,
      consentFlag: json['consentFlag'] as bool? ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'studentId': studentId,
      'name': name,
      'email': email,
      'college': college,
      'yearLevel': yearLevel,
      'sex': sex,
      'consentFlag': consentFlag,
      'createdAt': createdAt?.toIso8601String(),
    };
  }
}

class AuthResponseModel {
  final bool success;
  final AuthDataModel data;

  AuthResponseModel({
    required this.success,
    required this.data,
  });

  factory AuthResponseModel.fromJson(Map<String, dynamic> json) {
    return AuthResponseModel(
      success: json['success'] as bool,
      data: AuthDataModel.fromJson(json['data'] as Map<String, dynamic>),
    );
  }
}

class AuthDataModel {
  final String token;
  final String role;
  final StudentModel student;

  AuthDataModel({
    required this.token,
    required this.role,
    required this.student,
  });

  factory AuthDataModel.fromJson(Map<String, dynamic> json) {
    return AuthDataModel(
      token: json['token'] as String,
      role: json['role'] as String,
      student: StudentModel.fromJson(json['student'] as Map<String, dynamic>),
    );
  }
}

class LoginRequestModel {
  final String role;
  final String studentId;
  final String password;

  LoginRequestModel({
    required this.role,
    required this.studentId,
    required this.password,
  });

  Map<String, dynamic> toJson() {
    return {
      'role': role,
      'studentId': studentId,
      'password': password,
    };
  }
}

class SignupRequestModel {
  final String role;
  final String studentId;
  final String name;
  final String email;
  final String password;
  final String college;
  final int yearLevel;
  final String sex;

  SignupRequestModel({
    required this.role,
    required this.studentId,
    required this.name,
    required this.email,
    required this.password,
    required this.college,
    required this.yearLevel,
    required this.sex,
  });

  Map<String, dynamic> toJson() {
    return {
      'role': role,
      'studentId': studentId,
      'name': name,
      'email': email,
      'password': password,
      'college': college,
      'yearLevel': yearLevel,
      'sex': sex,
    };
  }
}
