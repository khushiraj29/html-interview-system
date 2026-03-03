/**
 * evaluator.js
 * Keyword-based semantic similarity scoring engine for evaluating interview answers.
 */

/**
 * Normalize text: lowercase and remove punctuation
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Check if a keyword (or partial keyword phrase) appears in text
 * @param {string} keyword
 * @param {string} normalizedText
 * @returns {boolean}
 */
function keywordInText(keyword, normalizedText) {
  const normalizedKeyword = normalizeText(keyword);
  // Check for exact phrase or all words present
  if (normalizedText.includes(normalizedKeyword)) return true;
  // For multi-word keywords, check if all words are present
  const words = normalizedKeyword.split(' ');
  if (words.length > 1) {
    return words.every(word => word.length > 2 && normalizedText.includes(word));
  }
  return false;
}

/**
 * Get category-related coherence words for on-topic checking
 * @param {string} category
 * @returns {string[]}
 */
function getCategoryWords(category) {
  const categoryMap = {
    basics: ['html', 'element', 'tag', 'document', 'browser', 'page', 'markup'],
    attributes: ['attribute', 'element', 'value', 'html', 'tag'],
    links: ['link', 'href', 'anchor', 'url', 'navigation', 'page'],
    images: ['image', 'img', 'src', 'visual', 'picture', 'display'],
    forms: ['form', 'input', 'submit', 'field', 'user', 'data', 'validation'],
    lists: ['list', 'item', 'element', 'ordered', 'unordered'],
    tables: ['table', 'row', 'cell', 'data', 'column', 'grid'],
    semantic: ['semantic', 'meaning', 'element', 'structure', 'html', 'content'],
    meta: ['meta', 'head', 'html', 'document', 'browser', 'search'],
    accessibility: ['accessibility', 'screen reader', 'aria', 'user', 'assistive'],
    media: ['media', 'video', 'audio', 'source', 'format', 'browser'],
    'data-attributes': ['data', 'attribute', 'javascript', 'html', 'element'],
    canvas: ['canvas', 'javascript', 'draw', 'graphics', '2d', 'context'],
    'web-storage': ['storage', 'browser', 'data', 'session', 'local', 'javascript'],
    iframe: ['iframe', 'frame', 'embed', 'content', 'page', 'browser'],
    SVG: ['svg', 'vector', 'graphics', 'image', 'scale', 'xml'],
    'HTML5 APIs': ['api', 'html5', 'javascript', 'browser', 'feature'],
    'shadow-dom': ['shadow', 'dom', 'encapsulation', 'component', 'element'],
    'web-components': ['component', 'custom', 'element', 'reusable', 'html'],
    'custom-elements': ['custom', 'element', 'define', 'class', 'html', 'javascript'],
    'service-workers': ['service', 'worker', 'cache', 'offline', 'background'],
    websockets: ['websocket', 'connection', 'real-time', 'communication', 'server'],
    CORS: ['cors', 'cross-origin', 'request', 'browser', 'header', 'security'],
    CSP: ['csp', 'security', 'policy', 'content', 'script', 'browser'],
    'progressive-enhancement': ['progressive', 'enhancement', 'html', 'css', 'javascript', 'browser'],
    performance: ['performance', 'load', 'optimize', 'browser', 'resource', 'speed'],
    SEO: ['seo', 'search', 'engine', 'optimization', 'meta', 'content']
  };
  return categoryMap[category] || ['html', 'element', 'web', 'browser'];
}

/**
 * Generate personalized feedback based on score and matched/missed keywords
 * @param {number} score
 * @param {string[]} matchedKeywords
 * @param {string[]} missedKeywords
 * @param {string} category
 * @returns {string}
 */
function generateFeedback(score, matchedKeywords, missedKeywords, category) {
  let prefix;
  if (score <= 3) {
    prefix = 'Needs improvement.';
  } else if (score <= 6) {
    prefix = 'Decent answer.';
  } else if (score <= 8) {
    prefix = 'Good answer!';
  } else {
    prefix = 'Excellent answer!';
  }

  let detail = '';
  if (matchedKeywords.length > 0) {
    detail += ` You correctly covered: ${matchedKeywords.slice(0, 3).join(', ')}.`;
  }
  if (missedKeywords.length > 0) {
    detail += ` Consider also mentioning: ${missedKeywords.slice(0, 3).join(', ')}.`;
  }

  return prefix + detail;
}

/**
 * Evaluate a user's answer against the correct answer and keywords.
 * @param {string} userAnswer - The answer provided by the user
 * @param {object} question - The question object from questions.json
 * @returns {object} Evaluation result with score, feedback, strengths, weaknesses, suggestions
 */
function evaluateAnswer(userAnswer, question) {
  const normalizedUserAnswer = normalizeText(userAnswer || '');
  const normalizedCorrectAnswer = normalizeText(question.correctAnswer);
  const keywords = question.keywords || [];

  // 1. Keyword match ratio (60% weight)
  const matchedKeywords = [];
  const missedKeywords = [];

  keywords.forEach(keyword => {
    if (keywordInText(keyword, normalizedUserAnswer)) {
      matchedKeywords.push(keyword);
    } else {
      missedKeywords.push(keyword);
    }
  });

  const keywordRatio = keywords.length > 0 ? matchedKeywords.length / keywords.length : 0;
  const keywordScore = keywordRatio * 10 * 0.6;

  // 2. Answer length adequacy (20% weight)
  // Compare word count of user answer relative to correct answer
  const MIN_LENGTH_RATIO = 0.3;
  const MIN_EXPECTED_WORDS = 10;
  const userWords = normalizedUserAnswer.split(' ').filter(w => w.length > 0);
  const correctWords = normalizedCorrectAnswer.split(' ').filter(w => w.length > 0);
  const lengthRatio = Math.min(userWords.length / Math.max(correctWords.length * MIN_LENGTH_RATIO, MIN_EXPECTED_WORDS), 1);
  const lengthScore = lengthRatio * 10 * 0.2;

  // 3. Coherence check (20% weight) — check if answer is on-topic
  const categoryWords = getCategoryWords(question.category);
  const matchedCategoryWords = categoryWords.filter(word =>
    keywordInText(word, normalizedUserAnswer)
  );
  const coherenceRatio = categoryWords.length > 0 ? matchedCategoryWords.length / categoryWords.length : 0;
  const coherenceScore = coherenceRatio * 10 * 0.2;

  // Final score
  const rawScore = keywordScore + lengthScore + coherenceScore;
  const score = Math.min(10, Math.max(0, Math.round(rawScore)));

  // Build strengths (keywords covered)
  const strengths = matchedKeywords.slice(0, 4).map(kw => `Mentioned "${kw}"`);
  if (userWords.length >= correctWords.length * 0.4) {
    strengths.push('Provided a sufficiently detailed answer');
  }

  // Build weaknesses (keywords missed)
  const weaknesses = missedKeywords.slice(0, 3).map(kw => `Did not mention "${kw}"`);
  if (userWords.length < 10) {
    weaknesses.push('Answer was too brief');
  }

  // Build suggestions
  const suggestions = [];
  if (missedKeywords.length > 0) {
    suggestions.push(`Try to also cover: ${missedKeywords.slice(0, 3).join(', ')}`);
  }
  if (question.followUp) {
    suggestions.push(`Think about: "${question.followUp}"`);
  }
  if (score < 5 && question.hint) {
    suggestions.push(`Hint: ${question.hint}`);
  }

  const feedback = generateFeedback(score, matchedKeywords, missedKeywords, question.category);

  return {
    score,
    feedback,
    strengths: strengths.length > 0 ? strengths : ['Attempted to answer the question'],
    weaknesses: weaknesses.length > 0 ? weaknesses : [],
    suggestions: suggestions.length > 0 ? suggestions : ['Review the correct answer for more detail'],
    correctAnswer: question.correctAnswer,
    keywords: matchedKeywords
  };
}

module.exports = { evaluateAnswer };
