class AuthDataModel {
  final String studentId;
  final String name;
  final String email;
  final String college;
  final int yearLevel;
  final String sex;
  final bool consentFlag;
  final String? token;

  AuthDataModel({
    required this.studentId,
    required this.name,
    required this.email,
    required this.college,
    required this.yearLevel,
    required this.sex,
    required this.consentFlag,
    this.token,
  });

  factory AuthDataModel.fromJson(Map<String, dynamic> json) {
    return AuthDataModel(
      studentId: json['studentId'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      college: json['college'] as String,
      yearLevel: json['yearLevel'] as int,
      sex: json['sex'] as String,
      consentFlag: (json['consentFlag'] as bool?) ?? false,
      token: json['token'] as String?,
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
      'token': token,
    };
  }
}

class LoginRequestModel {
  final String studentId;
  final String password;

  LoginRequestModel({
    required this.studentId,
    required this.password,
  });

  Map<String, dynamic> toJson() {
    return {
      'studentId': studentId,
      'password': password,
    };
  }
}

class SignupRequestModel {
  final String studentId;
  final String name;
  final String email;
  final String password;
  final String college;
  final int yearLevel;
  final String sex;

  SignupRequestModel({
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

class AuthResponseModel {
  final String message;
  final AuthDataModel? student;
  final String? token;

  AuthResponseModel({
    required this.message,
    this.student,
    this.token,
  });

  factory AuthResponseModel.fromJson(Map<String, dynamic> json) {
    return AuthResponseModel(
      message: json['message'] as String,
      student: json['student'] != null
          ? AuthDataModel.fromJson(json['student'] as Map<String, dynamic>)
          : null,
      token: json['token'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'message': message,
      'student': student?.toJson(),
      'token': token,
    };
  }
}
