
class ApiResponse<T> {
  final bool success;
  final T? data;
  final String? message;
  final dynamic error;

  ApiResponse({
    required this.success,
    this.data,
    this.message,
    this.error,
  });

  factory ApiResponse.fromJson(Map<String, dynamic> json) {
    return ApiResponse(
      success: json['success'] ?? false,
      data: json['data'],
      message: json['message'],
    );
  }

  @override
  String toString() {
    return 'ApiResponse(success: $success, data: $data, message: $message, error: $error)';
  }
}

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic originalError;

  ApiException({
    required this.message,
    this.statusCode,
    this.originalError,
  });

  @override
  String toString() => message;
}

class NetworkException extends ApiException {
  NetworkException(String message) : super(message: message);
}

class UnauthorizedException extends ApiException {
  UnauthorizedException(String message) 
    : super(message: message, statusCode: 401);
}

class NotFoundException extends ApiException {
  NotFoundException(String message) 
    : super(message: message, statusCode: 404);
}

class ServerException extends ApiException {
  ServerException(String message) 
    : super(message: message, statusCode: 500);
}

class ValidationException extends ApiException {
  ValidationException(String message) 
    : super(message: message, statusCode: 400);
}
