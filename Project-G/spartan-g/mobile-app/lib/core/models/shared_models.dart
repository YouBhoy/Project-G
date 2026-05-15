// Dashboard Models
class DashboardDataModel {
  final StudentDashboardModel student;
  final ClassificationModel? latestClassification;
  final String riskLevel;
  final String nextAction;
  final List<MoodSeriesModel> moodSeries;

  DashboardDataModel({
    required this.student,
    this.latestClassification,
    required this.riskLevel,
    required this.nextAction,
    required this.moodSeries,
  });

  factory DashboardDataModel.fromJson(Map<String, dynamic> json) {
    final studentJson = json['student'];
    return DashboardDataModel(
      student: studentJson is Map<String, dynamic>
          ? StudentDashboardModel.fromJson(studentJson)
          : StudentDashboardModel.empty(),
      latestClassification: json['latestClassification'] != null
          ? ClassificationModel.fromJson(
              json['latestClassification'] as Map<String, dynamic>,
            )
          : null,
      riskLevel: json['riskLevel']?.toString() ?? 'Unknown',
      nextAction: json['nextAction']?.toString() ?? 'Pending',
      moodSeries: (json['moodSeries'] as List<dynamic>?)
              ?.map((item) =>
                  MoodSeriesModel.fromJson(item as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class StudentDashboardModel {
  final String studentId;
  final String name;
  final bool consentFlag;

  StudentDashboardModel({
    required this.studentId,
    required this.name,
    required this.consentFlag,
  });

  factory StudentDashboardModel.empty() {
    return StudentDashboardModel(
      studentId: '',
      name: 'No data available',
      consentFlag: false,
    );
  }

  factory StudentDashboardModel.fromJson(Map<String, dynamic> json) {
    return StudentDashboardModel(
      studentId: json['studentId']?.toString() ?? '',
      name: json['name']?.toString() ?? 'No data available',
      consentFlag: json['consentFlag'] as bool? ?? false,
    );
  }
}

class ClassificationModel {
  final int classificationId;
  final String riskLevel;
  final String? trajectory;
  final MetaModel? meta;
  final DateTime? generatedAt;

  ClassificationModel({
    required this.classificationId,
    required this.riskLevel,
    required this.trajectory,
    required this.meta,
    this.generatedAt,
  });

  factory ClassificationModel.fromJson(Map<String, dynamic> json) {
    return ClassificationModel(
      classificationId: json['classificationId'] is int
          ? json['classificationId'] as int
          : int.tryParse(json['classificationId']?.toString() ?? '') ?? 0,
      riskLevel: json['riskLevel']?.toString() ?? 'Unknown',
      trajectory: json['trajectory']?.toString(),
      meta: json['meta'] is Map<String, dynamic>
          ? MetaModel.fromJson(json['meta'] as Map<String, dynamic>)
          : null,
      generatedAt: DateTime.tryParse(json['generatedAt']?.toString() ?? ''),
    );
  }
}

class MetaModel {
  final String? source;
  final SubscaleScoresModel? subscaleScores;
  final Map<String, dynamic>? labels;
  final Map<String, dynamic>? slopes;

  MetaModel({
    required this.source,
    required this.subscaleScores,
    this.labels,
    this.slopes,
  });

  factory MetaModel.fromJson(Map<String, dynamic> json) {
    return MetaModel(
      source: json['source']?.toString(),
      subscaleScores: json['subscaleScores'] is Map<String, dynamic>
          ? SubscaleScoresModel.fromJson(
              json['subscaleScores'] as Map<String, dynamic>,
            )
          : null,
      labels: json['labels'] is Map<String, dynamic>
          ? Map<String, dynamic>.from(json['labels'] as Map<String, dynamic>)
          : json['subscaleLabels'] is Map<String, dynamic>
              ? Map<String, dynamic>.from(
                  json['subscaleLabels'] as Map<String, dynamic>,
                )
              : null,
      slopes: json['slopes'] is Map<String, dynamic>
          ? Map<String, dynamic>.from(json['slopes'] as Map<String, dynamic>)
          : null,
    );
  }
}

class SubscaleScoresModel {
  final int depression;
  final int anxiety;
  final int stress;

  SubscaleScoresModel({
    required this.depression,
    required this.anxiety,
    required this.stress,
  });

  factory SubscaleScoresModel.fromJson(Map<String, dynamic> json) {
    return SubscaleScoresModel(
      depression: json['depression'] as int? ?? 0,
      anxiety: json['anxiety'] as int? ?? 0,
      stress: json['stress'] as int? ?? 0,
    );
  }
}

class MoodSeriesModel {
  final DateTime? promptTime;
  final int moodScore;
  final int energyScore;

  MoodSeriesModel({
    required this.promptTime,
    required this.moodScore,
    required this.energyScore,
  });

  factory MoodSeriesModel.fromJson(Map<String, dynamic> json) {
    return MoodSeriesModel(
      promptTime: DateTime.tryParse(json['promptTime']?.toString() ?? ''),
      moodScore: json['moodScore'] is int
          ? json['moodScore'] as int
          : int.tryParse(json['moodScore']?.toString() ?? '') ?? 0,
      energyScore: json['energyScore'] is int
          ? json['energyScore'] as int
          : int.tryParse(json['energyScore']?.toString() ?? '') ?? 0,
    );
  }
}

// Assessment Models
class AssessmentQuestionModel {
  final int itemNumber;
  final String question;
  final List<String> options;

  AssessmentQuestionModel({
    required this.itemNumber,
    required this.question,
    required this.options,
  });

  factory AssessmentQuestionModel.fromJson(Map<String, dynamic> json) {
    final optionsValue = json['options'];
    return AssessmentQuestionModel(
      itemNumber: json['itemNumber'] is int
          ? json['itemNumber'] as int
          : int.tryParse(json['itemNumber']?.toString() ?? '') ?? 0,
      question: json['question']?.toString() ?? json['text']?.toString() ?? 'No question available',
      options: optionsValue is List
          ? optionsValue.map((value) => value?.toString() ?? '').toList()
          : const ['0', '1', '2', '3'],
    );
  }
}

class AssessmentResponseModel {
  final int itemNumber;
  final int score;

  AssessmentResponseModel({
    required this.itemNumber,
    required this.score,
  });

  Map<String, dynamic> toJson() {
    return {
      'itemNumber': itemNumber,
      'score': score,
    };
  }
}

class AssessmentSubmitRequestModel {
  final List<AssessmentResponseModel> responses;

  AssessmentSubmitRequestModel({required this.responses});

  Map<String, dynamic> toJson() {
    return {
      'responses': responses.map((r) => r.toJson()).toList(),
    };
  }
}

class AssessmentResultModel {
  final String assessmentType;
  final Map<String, int> scores;
  final String severity;
  final String riskLevel;
  final DateTime? submittedAt;

  AssessmentResultModel({
    required this.assessmentType,
    required this.scores,
    required this.severity,
    required this.riskLevel,
    required this.submittedAt,
  });

  factory AssessmentResultModel.fromJson(Map<String, dynamic> json) {
    return AssessmentResultModel(
      assessmentType: json['assessmentType']?.toString() ?? 'Unknown',
      scores: (json['scores'] as Map<String, dynamic>?)?.map(
            (key, value) => MapEntry(key, value is int ? value : int.tryParse(value?.toString() ?? '') ?? 0),
          ) ??
          const {},
      severity: json['severity']?.toString() ?? 'Pending',
      riskLevel: json['riskLevel']?.toString() ?? 'Pending',
      submittedAt: DateTime.tryParse(json['submittedAt']?.toString() ?? ''),
    );
  }
}

// ESM Models
class ESMSubmitRequestModel {
  final int moodScore;
  final int energyScore;
  final String stressorCategory;
  final bool physicalSymptom;
  final bool helpIntent;

  ESMSubmitRequestModel({
    required this.moodScore,
    required this.energyScore,
    required this.stressorCategory,
    required this.physicalSymptom,
    required this.helpIntent,
  });

  Map<String, dynamic> toJson() {
    return {
      'moodScore': moodScore,
      'energyScore': energyScore,
      'stressorCategory': stressorCategory,
      'physicalSymptom': physicalSymptom,
      'helpIntent': helpIntent,
    };
  }
}

// Appointment Models
class AvailabilitySlotModel {
  final String slotId;
  final String counselor;
  final DateTime startTime;
  final DateTime endTime;
  final int availableCapacity;

  AvailabilitySlotModel({
    required this.slotId,
    required this.counselor,
    required this.startTime,
    required this.endTime,
    required this.availableCapacity,
  });

  factory AvailabilitySlotModel.fromJson(Map<String, dynamic> json) {
    return AvailabilitySlotModel(
      slotId: json['slotId'] as String,
      counselor: json['counselor'] as String,
      startTime: DateTime.parse(json['startTime'] as String),
      endTime: DateTime.parse(json['endTime'] as String),
      availableCapacity: json['availableCapacity'] as int,
    );
  }
}

class AppointmentModel {
  final String appointmentId;
  final String studentId;
  final String slotId;
  final String counselor;
  final DateTime appointmentTime;
  final String status;
  final DateTime? createdAt;

  AppointmentModel({
    required this.appointmentId,
    required this.studentId,
    required this.slotId,
    required this.counselor,
    required this.appointmentTime,
    required this.status,
    this.createdAt,
  });

  factory AppointmentModel.fromJson(Map<String, dynamic> json) {
    return AppointmentModel(
      appointmentId: json['appointmentId'] as String,
      studentId: json['studentId'] as String,
      slotId: json['slotId'] as String,
      counselor: json['counselor'] as String,
      appointmentTime: DateTime.parse(json['appointmentTime'] as String),
      status: json['status'] as String,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
    );
  }
}

class BookAppointmentRequestModel {
  final String slotId;

  BookAppointmentRequestModel({required this.slotId});

  Map<String, dynamic> toJson() {
    return {
      'slotId': slotId,
    };
  }
}

// Emergency Contact Models
class EmergencyContactModel {
  final String contactId;
  final String name;
  final String phoneNumber;
  final String category;
  final String description;
  final bool available247;

  EmergencyContactModel({
    required this.contactId,
    required this.name,
    required this.phoneNumber,
    required this.category,
    required this.description,
    required this.available247,
  });

  factory EmergencyContactModel.fromJson(Map<String, dynamic> json) {
    return EmergencyContactModel(
      contactId: json['contactId'] as String,
      name: json['name'] as String,
      phoneNumber: json['phoneNumber'] as String,
      category: json['category'] as String,
      description: json['description'] as String,
      available247: json['available247'] as bool? ?? true,
    );
  }
}

// Consent Model
class ConsentRequestModel {
  final bool consent;

  ConsentRequestModel({required this.consent});

  Map<String, dynamic> toJson() {
    return {
      'consent': consent,
    };
  }
}
