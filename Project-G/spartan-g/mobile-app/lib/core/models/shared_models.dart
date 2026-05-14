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
    return DashboardDataModel(
      student: StudentDashboardModel.fromJson(
        json['student'] as Map<String, dynamic>,
      ),
      latestClassification: json['latestClassification'] != null
          ? ClassificationModel.fromJson(
              json['latestClassification'] as Map<String, dynamic>,
            )
          : null,
      riskLevel: json['riskLevel'] as String? ?? 'Unknown',
      nextAction: json['nextAction'] as String? ?? '',
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

  factory StudentDashboardModel.fromJson(Map<String, dynamic> json) {
    return StudentDashboardModel(
      studentId: json['studentId'] as String,
      name: json['name'] as String,
      consentFlag: json['consentFlag'] as bool? ?? false,
    );
  }
}

class ClassificationModel {
  final int classificationId;
  final String riskLevel;
  final String trajectory;
  final MetaModel meta;

  ClassificationModel({
    required this.classificationId,
    required this.riskLevel,
    required this.trajectory,
    required this.meta,
  });

  factory ClassificationModel.fromJson(Map<String, dynamic> json) {
    return ClassificationModel(
      classificationId: json['classificationId'] as int,
      riskLevel: json['riskLevel'] as String,
      trajectory: json['trajectory'] as String,
      meta: MetaModel.fromJson(json['meta'] as Map<String, dynamic>),
    );
  }
}

class MetaModel {
  final String source;
  final SubscaleScoresModel subscaleScores;

  MetaModel({
    required this.source,
    required this.subscaleScores,
  });

  factory MetaModel.fromJson(Map<String, dynamic> json) {
    return MetaModel(
      source: json['source'] as String,
      subscaleScores: SubscaleScoresModel.fromJson(
        json['subscaleScores'] as Map<String, dynamic>,
      ),
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
  final DateTime promptTime;
  final int moodScore;
  final int energyScore;

  MoodSeriesModel({
    required this.promptTime,
    required this.moodScore,
    required this.energyScore,
  });

  factory MoodSeriesModel.fromJson(Map<String, dynamic> json) {
    return MoodSeriesModel(
      promptTime: DateTime.parse(json['promptTime'] as String),
      moodScore: json['moodScore'] as int,
      energyScore: json['energyScore'] as int,
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
    return AssessmentQuestionModel(
      itemNumber: json['itemNumber'] as int,
      question: json['question'] as String,
      options: List<String>.from(json['options'] as List<dynamic>),
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
  final DateTime submittedAt;

  AssessmentResultModel({
    required this.assessmentType,
    required this.scores,
    required this.severity,
    required this.riskLevel,
    required this.submittedAt,
  });

  factory AssessmentResultModel.fromJson(Map<String, dynamic> json) {
    return AssessmentResultModel(
      assessmentType: json['assessmentType'] as String,
      scores: Map<String, int>.from(json['scores'] as Map<String, dynamic>),
      severity: json['severity'] as String,
      riskLevel: json['riskLevel'] as String,
      submittedAt: DateTime.parse(json['submittedAt'] as String),
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
