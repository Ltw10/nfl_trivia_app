/**
 * Normalize a player name for comparison (trim, collapse spaces, optional case-insensitive).
 */
export function normalizeName(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/\s+/g, ' ');
}

/**
 * Check if user answer matches correct answer with flexible matching:
 * - Trim and collapse spaces
 * - Case-insensitive
 * - Optional: strip suffixes like "Jr.", "III"
 */
export function isCorrectAnswer(userAnswer, correctAnswer) {
  const u = normalizeName(userAnswer).toLowerCase();
  const c = normalizeName(correctAnswer).toLowerCase();
  if (u === c) return true;
  const uClean = u.replace(/\s+(jr\.?|sr\.?|iii?|iv|ii|v)$/i, '').trim();
  const cClean = c.replace(/\s+(jr\.?|sr\.?|iii?|iv|ii|v)$/i, '').trim();
  return uClean === cClean;
}

/**
 * Check if user answer matches any of the valid correct answers (e.g. any player
 * that fits the round criteria). Uses the same flexible matching as isCorrectAnswer.
 */
export function matchesAnyAnswer(userAnswer, correctAnswers) {
  if (!Array.isArray(correctAnswers) || correctAnswers.length === 0) return false;
  return correctAnswers.some((correct) => isCorrectAnswer(userAnswer, correct));
}
