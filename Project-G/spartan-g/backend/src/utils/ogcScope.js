import { pseudonymizeStudentId } from './helpers.js';

export function normalizeScopeValue(value) {
  return `${value || ''}`.trim().toLowerCase();
}

export function facilitatorMatchesStudent(facilitator, student) {
  if (!facilitator || !student) return false;

  const facilitatorId = Number(facilitator.facilitatorId);
  if (Number(student.facilitatorId) === facilitatorId) return true;
  if (Number(student.assignedFacilitatorId) === facilitatorId) return true;
  if (Number(student.ownerFacilitatorId) === facilitatorId) return true;

  const facilitatorScope = normalizeScopeValue(facilitator.assignedCollege);
  if (!facilitatorScope || facilitatorScope === 'all') return true;

  const studentScope = normalizeScopeValue(student.assignedCollege || student.college || student.scope);
  return studentScope === facilitatorScope;
}

export function getAuthorizedStudents(snapshot, facilitator) {
  return (snapshot.students || []).filter((student) => facilitatorMatchesStudent(facilitator, student));
}

export function getAuthorizedStudentIds(snapshot, facilitator) {
  return new Set(getAuthorizedStudents(snapshot, facilitator).map((student) => String(student.studentId)));
}

export function resolveAuthorizedStudent(snapshot, facilitator, identifier) {
  const students = getAuthorizedStudents(snapshot, facilitator);
  const rawIdentifier = `${identifier || ''}`.trim();
  if (!rawIdentifier) return null;

  return students.find((student) => {
    if (`${student.studentId}` === rawIdentifier) return true;
    return pseudonymizeStudentId(student.studentId) === rawIdentifier.toUpperCase();
  }) || null;
}

export function canRevealStudentIdentity(student) {
  return Boolean(student?.consentFlag);
}

export function buildPublicStudentProfile(student) {
  return {
    pseudoId: pseudonymizeStudentId(student.studentId),
    canRevealIdentity: canRevealStudentIdentity(student),
    college: student.college || null,
    yearLevel: student.yearLevel ?? null
  };
}

export function buildCriticalAlert(student, latestClassification) {
  const publicProfile = buildPublicStudentProfile(student);
  return {
    pseudoId: publicProfile.pseudoId,
    latestClassificationAt: latestClassification?.generatedAt || null,
    contact: {
      canContact: true,
      canRevealContact: publicProfile.canRevealIdentity,
      pseudoId: publicProfile.pseudoId,
    }
  };
}
