import 'package:logger/logger.dart';

final logger = Logger(
  printer: PrettyPrinter(
    methodCount: 2,
    errorMethodCount: 8,
    lineLength: 120,
    colors: true,
    printEmojis: true,
    dateTimeFormat: DateTimeFormat.onlyTimeAndSinceStart,
  ),
);

class AppLogger {
  static void debug(String message) => logger.d(message);
  static void info(String message) => logger.i(message);
  static void warning(String message) => logger.w(message);
  static void error(String message, {dynamic error, StackTrace? stackTrace}) {
    logger.e(message, error: error, stackTrace: stackTrace);
  }
  static void verbose(String message) => logger.t(message);
}
