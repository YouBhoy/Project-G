import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:spartan_g_mobile/core/api/api_client.dart';
import 'package:spartan_g_mobile/core/constants/api_constants.dart';
import 'package:spartan_g_mobile/core/constants/string_constants.dart';
import 'package:spartan_g_mobile/core/models/shared_models.dart';
import '../../auth/presentation/consent_screen.dart';

class AssessmentDetailScreen extends ConsumerStatefulWidget {
  final String assessmentType; // 'DASS21', 'PHQ9', 'GAD7'
  const AssessmentDetailScreen({Key? key, required this.assessmentType}) : super(key: key);

  @override
  ConsumerState<AssessmentDetailScreen> createState() => _AssessmentDetailScreenState();
}

class _AssessmentDetailScreenState extends ConsumerState<AssessmentDetailScreen> {
  List<AssessmentQuestionModel> questions = [];
  Map<int, int> answers = {};
  bool loading = true;
  String? error;
  bool submitting = false;

  @override
  void initState() {
    super.initState();
    _loadQuestions();
  }

  Future<void> _loadQuestions() async {
    setState(() { loading = true; error = null; });
    final api = ref.read(apiClientProvider);
    try {
      if (widget.assessmentType == 'DASS21') {
        final resp = await api.get(ApiConstants.dass21Questions);
        final data = resp['data'] ?? resp;
        final rawQuestions = data is Map<String, dynamic> ? data['questions'] : null;
        final qs = (rawQuestions as List<dynamic>?)
                ?.whereType<Map<String, dynamic>>()
                .map(AssessmentQuestionModel.fromJson)
                .toList() ??
            [];
        setState(() {
          questions = qs;
        });
      } else {
        // Load local question sets for PHQ9/GAD7 from code-defined arrays
        final local = _localQuestions(widget.assessmentType);
        setState(() { questions = local; });
      }
    } catch (e) {
      setState(() { error = e.toString(); });
    } finally {
      setState(() { loading = false; });
    }
  }

  List<AssessmentQuestionModel> _localQuestions(String type) {
    if (type == 'PHQ9') {
      final texts = [
        'Little interest or pleasure in doing things',
        'Feeling down, depressed, or hopeless',
        'Trouble falling or staying asleep, or sleeping too much',
        'Feeling tired or having little energy',
        'Poor appetite or overeating',
        'Feeling bad about yourself or that you are a failure',
        'Trouble concentrating on things',
        'Moving or speaking slowly, or being fidgety or restless',
        'Thoughts that you would be better off dead'
      ];
      return List.generate(texts.length, (i) => AssessmentQuestionModel(itemNumber: i+1, question: texts[i], options: ['0','1','2','3']));
    }
    if (type == 'GAD7') {
      final texts = [
        'Feeling nervous, anxious or on edge',
        'Not being able to stop or control worrying',
        'Worrying too much about different things',
        'Trouble relaxing',
        'Being so restless that it is hard to sit still',
        'Becoming easily annoyed or irritable',
        'Feeling afraid as if something awful might happen'
      ];
      return List.generate(texts.length, (i) => AssessmentQuestionModel(itemNumber: i+1, question: texts[i], options: ['0','1','2','3']));
    }
    return [];
  }

  Future<void> _submit() async {
    // Validation
    final expected = widget.assessmentType == 'DASS21' ? 21 : widget.assessmentType == 'PHQ9' ? 9 : 7;
    if (answers.length != expected) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please answer all items')));
      return;
    }

    setState(() => submitting = true);
    final api = ref.read(apiClientProvider);
    try {
      final responses = answers.entries.map((e) => AssessmentResponseModel(itemNumber: e.key, score: e.value)).toList();
      final payload = AssessmentSubmitRequestModel(responses: responses);

      dynamic resp;
      if (widget.assessmentType == 'DASS21') {
        resp = await api.post(ApiConstants.dass21Submit, data: payload.toJson());
      } else if (widget.assessmentType == 'PHQ9') {
        // PHQ expects { scores: [{itemNumber, score}, ...] }
        resp = await api.post(ApiConstants.phq9Submit, data: {'scores': payload.responses.map((r) => r.toJson()).toList()});
      } else {
        resp = await api.post(ApiConstants.gad7Submit, data: {'scores': payload.responses.map((r) => r.toJson()).toList()});
      }

      final data = resp['data'] ?? resp;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Submitted — Risk: ${data['riskLevel'] ?? data['severity'] ?? 'Unknown'}')));
      // Navigate back to dashboard/home
      if (context.mounted) context.go('/home');
    } catch (e) {
      final errStr = e.toString();
      if (errStr.toLowerCase().contains('consent')) {
        // Ask user to accept consent, then retry
        final accepted = await Navigator.of(context).push<bool?>(
          MaterialPageRoute(builder: (_) => const ConsentScreen()),
        );
        if (accepted == true) {
          // retry
          await _submit();
          return;
        }
      }
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Submit failed: $e')));
    } finally {
      if (mounted) setState(() => submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('${widget.assessmentType} Assessment')),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(child: Text('Error: $error'))
              : Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(children: [
                    Expanded(
                      child: ListView.builder(
                        itemCount: questions.length,
                        itemBuilder: (context, idx) {
                          final q = questions[idx];
                          return Card(
                            margin: const EdgeInsets.symmetric(vertical: 6),
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text('Item ${q.itemNumber}: ${q.question}', style: const TextStyle(fontWeight: FontWeight.w600)),
                                const SizedBox(height: 8),
                                Wrap(
                                  spacing: 8,
                                  children: List.generate(q.options.length, (i) {
                                    final val = i;
                                    final selected = answers[q.itemNumber] == val;
                                    return ChoiceChip(
                                      label: Text('${q.options[i]}'),
                                      selected: selected,
                                      onSelected: (_) => setState(() => answers[q.itemNumber] = val),
                                    );
                                  }),
                                )
                              ]),
                            ),
                          );
                        },
                      ),
                    ),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: submitting ? null : _submit,
                        child: submitting ? const CircularProgressIndicator() : const Text(StringConstants.submit),
                      ),
                    )
                  ]),
                ),
    );
  }
}
