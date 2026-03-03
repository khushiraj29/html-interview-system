/**
 * adaptive.js
 * Adaptive difficulty engine for selecting the next interview question.
 */

/**
 * Determine the target difficulty based on average score and current difficulty.
 * @param {string} currentDifficulty - 'easy', 'medium', or 'hard'
 * @param {number} averageScore - Running average score (0-10)
 * @returns {string} Target difficulty level
 */
function getTargetDifficulty(currentDifficulty, averageScore) {
  if (averageScore >= 8) {
    if (currentDifficulty === 'easy') return 'medium';
    if (currentDifficulty === 'medium') return 'hard';
  }
  if (averageScore <= 4) {
    if (currentDifficulty === 'hard') return 'medium';
    if (currentDifficulty === 'medium') return 'easy';
  }
  return currentDifficulty;
}

/**
 * Get the next question using adaptive difficulty selection.
 * @param {string} currentDifficulty - Current difficulty level
 * @param {number} averageScore - Running average score (0-10)
 * @param {number[]} answeredIds - Array of already answered question IDs
 * @param {object[]} questions - Full questions array from questions.json
 * @returns {object|null} Next question object, or null if none available
 */
function getNextQuestion(currentDifficulty, averageScore, answeredIds, questions) {
  const targetDifficulty = getTargetDifficulty(currentDifficulty, averageScore);

  // Get all questions at the target difficulty
  const allAtDifficulty = questions.filter(q => q.difficulty === targetDifficulty);

  if (allAtDifficulty.length === 0) return null;

  // Filter out already answered questions
  let available = allAtDifficulty.filter(q => !answeredIds.includes(q.id));

  // If no unanswered questions remain, loop back through all of that difficulty
  if (available.length === 0) {
    available = allAtDifficulty;
  }

  // Return a randomly selected question from the available pool
  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex];
}

/**
 * Get a human-readable difficulty label based on score.
 * @param {number} score - Score value (0-10)
 * @returns {string} 'easy', 'medium', or 'hard'
 */
function getDifficultyLabel(score) {
  if (score >= 8) return 'hard';
  if (score >= 5) return 'medium';
  return 'easy';
}

module.exports = { getNextQuestion, getDifficultyLabel };
