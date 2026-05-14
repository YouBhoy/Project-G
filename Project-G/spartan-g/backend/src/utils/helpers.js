export const DASS_SUBSCALES = {
  D: [3, 5, 10, 13, 16, 17, 21],
  A: [2, 4, 7, 9, 15, 19, 20],
  S: [1, 6, 8, 11, 12, 14, 18]
};

export const DASS_QUESTIONS = Array.from({ length: 21 }, (_, i) => {
  const itemNumber = i + 1;
  const subscale = Object.keys(DASS_SUBSCALES).find((k) => DASS_SUBSCALES[k].includes(itemNumber));
  return {
    itemNumber,
    subscale,
    text: `Dummy DASS-21 Question ${itemNumber}: Over the past week, I felt sample statement ${itemNumber}.`
  };
});

export function nowIso() {
  return new Date().toISOString();
}

export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function pseudonymizeStudentId(studentId) {
  const seed = `${studentId || ''}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const token = Math.abs(hash).toString(36).toUpperCase().slice(0, 6).padStart(6, '0');
  return `STU-${token}`;
}

