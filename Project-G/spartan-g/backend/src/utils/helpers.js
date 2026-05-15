export const DASS_SUBSCALES = {
  D: [3, 5, 10, 13, 16, 17, 21],
  A: [2, 4, 7, 9, 15, 19, 20],
  S: [1, 6, 8, 11, 12, 14, 18]
};

export const DASS_QUESTIONS = [
  { itemNumber: 1, subscale: 'S', text: 'I found it hard to wind down' },
  { itemNumber: 2, subscale: 'A', text: 'I was aware of dryness of my mouth' },
  { itemNumber: 3, subscale: 'D', text: 'I found it difficult to work up the motivation to do things' },
  { itemNumber: 4, subscale: 'A', text: 'I experienced breathing difficulty (e.g., excessively rapid breathing, breathlessness in the absence of physical exertion)' },
  { itemNumber: 5, subscale: 'D', text: 'I felt that I had nothing to look forward to' },
  { itemNumber: 6, subscale: 'S', text: 'I found myself getting agitated' },
  { itemNumber: 7, subscale: 'A', text: 'I experienced trembling (e.g., in the hands)' },
  { itemNumber: 8, subscale: 'S', text: 'I found it difficult to relax' },
  { itemNumber: 9, subscale: 'A', text: 'I was worried about situations in which I might panic and make a fool of myself' },
  { itemNumber: 10, subscale: 'D', text: 'I felt sad and depressed' },
  { itemNumber: 11, subscale: 'S', text: 'I found it hard to settle down' },
  { itemNumber: 12, subscale: 'S', text: 'I tended to over-react to situations' },
  { itemNumber: 13, subscale: 'D', text: 'I felt down-hearted and blue' },
  { itemNumber: 14, subscale: 'S', text: 'I found it difficult to calm down after something upset me' },
  { itemNumber: 15, subscale: 'A', text: 'I was afraid of losing control' },
  { itemNumber: 16, subscale: 'D', text: 'I was unable to become enthusiastic about anything' },
  { itemNumber: 17, subscale: 'D', text: 'I felt I was not worth much as a person' },
  { itemNumber: 18, subscale: 'S', text: 'I found myself getting upset rather easily' },
  { itemNumber: 19, subscale: 'A', text: 'I had a feeling of faintness' },
  { itemNumber: 20, subscale: 'A', text: 'I felt I was close to panic' },
  { itemNumber: 21, subscale: 'D', text: 'I felt that life was meaningless' }
];

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

