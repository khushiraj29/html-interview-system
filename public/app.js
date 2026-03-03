/**
 * app.js
 * Complete frontend JavaScript logic for the AI-Powered HTML Interview System.
 */

/* ============================================================
   State Management
   ============================================================ */
const state = {
  currentQuestion: null,
  answeredIds: [],
  scores: [],
  averageScore: 0,
  currentDifficulty: 'easy',
  isRecording: false,
  recognition: null,
  synthesis: window.speechSynthesis,
  totalQuestions: 0,
  sessionActive: false,
  // Track scores per difficulty for end-of-session breakdown
  difficultyScores: { easy: [], medium: [], hard: [] }
};

/* ============================================================
   DOM References
   ============================================================ */
const chatContainer = document.getElementById('chat-container');
const startBtn = document.getElementById('start-btn');
const micBtn = document.getElementById('mic-btn');
const nextBtn = document.getElementById('next-btn');
const endBtn = document.getElementById('end-btn');
const statusEl = document.getElementById('status');
const transcriptBox = document.getElementById('transcript-box');
const transcriptText = document.getElementById('transcript-text');
const resultsModal = document.getElementById('results-modal');
const newInterviewBtn = document.getElementById('new-interview-btn');
const textFallback = document.getElementById('text-fallback');
const textInput = document.getElementById('text-input');
const textSubmitBtn = document.getElementById('text-submit-btn');

/* ============================================================
   Speech Recognition Initialization
   ============================================================ */

/**
 * Initialize the Web Speech API recognition instance.
 * Falls back to text input if API is unsupported.
 */
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    // Fallback: show text input
    showError('Your browser does not support the Web Speech API. You can type your answers instead.');
    textFallback.style.display = 'flex';
    micBtn.style.display = 'none';
    return;
  }

  state.recognition = new SpeechRecognition();
  state.recognition.continuous = false;
  state.recognition.interimResults = true;
  state.recognition.lang = 'en-US';

  // Live transcript as user speaks
  state.recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const text = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += text;
      } else {
        interimTranscript += text;
      }
    }

    transcriptText.textContent = finalTranscript || interimTranscript || 'Listening…';

    // Auto-submit when a final result is available
    if (finalTranscript.trim()) {
      handleTranscript(finalTranscript.trim());
    }
  };

  // Called when recognition stops (naturally or via stopRecording)
  state.recognition.onend = () => {
    if (state.isRecording) {
      stopRecording();
    }
  };

  state.recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    stopRecording();

    const errorMessages = {
      'no-speech': 'No speech detected. Please try again.',
      'audio-capture': 'Microphone not found. Please check your microphone.',
      'not-allowed': 'Microphone access denied. Please allow microphone access.',
      'network': 'Network error during speech recognition.',
      'aborted': 'Speech recognition was aborted.'
    };

    const msg = errorMessages[event.error] || `Speech recognition error: ${event.error}`;
    if (event.error !== 'aborted') {
      showError(msg);
    }
  };
}

/* ============================================================
   Text-to-Speech
   ============================================================ */

/**
 * Speak text aloud using the Web Speech Synthesis API.
 * @param {string} text - Text to speak
 * @returns {Promise<void>} Resolves when speech finishes
 */
function speakText(text) {
  return new Promise((resolve) => {
    if (!state.synthesis) {
      resolve();
      return;
    }

    // Cancel any ongoing speech
    state.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.lang = 'en-US';

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    state.synthesis.speak(utterance);
  });
}

/* ============================================================
   Interview Flow
   ============================================================ */

/**
 * Start a new interview session.
 */
async function startInterview() {
  // Reset state
  state.answeredIds = [];
  state.scores = [];
  state.averageScore = 0;
  state.currentDifficulty = 'easy';
  state.totalQuestions = 0;
  state.sessionActive = true;
  state.difficultyScores = { easy: [], medium: [], hard: [] };

  // Clear chat
  chatContainer.innerHTML = '';

  // Update UI
  startBtn.style.display = 'none';
  endBtn.style.display = 'inline-flex';
  nextBtn.style.display = 'none';
  micBtn.disabled = true;

  updateStatsBar();
  setStatus('Starting interview…');

  // Initialize speech recognition
  initSpeechRecognition();

  // Welcome message
  const welcomeMsg = 'Welcome to your AI-powered HTML interview! I will ask you questions about HTML. ' +
    'Press the microphone button to record your answer. Let\'s get started with your first question!';
  addChatMessage('ai', welcomeMsg, 'info');
  await speakText(welcomeMsg);

  // Fetch first question
  await fetchNextQuestion();
}

/**
 * Fetch the next question from the API and display it.
 */
async function fetchNextQuestion() {
  setStatus('Loading next question…');

  try {
    const response = await fetch('/api/next-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentDifficulty: state.currentDifficulty,
        averageScore: state.averageScore,
        answeredIds: state.answeredIds
      })
    });

    if (!response.ok) {
      const err = await response.json();
      showError(err.error || 'Failed to load question.');
      return;
    }

    const question = await response.json();
    state.currentQuestion = question;
    displayQuestion(question);

  } catch (err) {
    console.error('Error fetching question:', err);
    showError('Could not connect to the server. Please make sure the server is running.');
  }
}

/**
 * Display a question in the chat and speak it aloud.
 * @param {object} question - Question object
 */
async function displayQuestion(question) {
  const label = `[${question.difficulty.toUpperCase()} — ${question.category}]`;
  const content = `${label}\n\n${question.question}`;

  addChatMessage('ai', content, 'question');
  micBtn.disabled = false;
  setStatus('🎤 Press the microphone button to record your answer.');

  await speakText(question.question);
}

/* ============================================================
   Recording
   ============================================================ */

/**
 * Start recording the user's spoken answer.
 */
function startRecording() {
  if (!state.recognition) {
    showError('Speech recognition is not available.');
    return;
  }
  if (state.isRecording) return;

  state.isRecording = true;
  micBtn.classList.add('recording');
  micBtn.textContent = '⏹';
  transcriptBox.style.display = 'flex';
  transcriptText.textContent = 'Listening…';
  setStatus('🔴 Recording… speak your answer now.');

  try {
    state.recognition.start();
  } catch (e) {
    console.error('Recognition start error:', e);
  }
}

/**
 * Stop recording.
 */
function stopRecording() {
  state.isRecording = false;
  micBtn.classList.remove('recording');
  micBtn.textContent = '🎤';
  transcriptBox.style.display = 'none';
  setStatus('Processing your answer…');

  try {
    if (state.recognition) state.recognition.stop();
  } catch (e) {
    // Ignore errors when stopping already-stopped recognition
  }
}

/* ============================================================
   Answer Handling
   ============================================================ */

/**
 * Handle the final speech transcript.
 * @param {string} transcript - Recognized speech text
 */
function handleTranscript(transcript) {
  stopRecording();

  if (!transcript || transcript.trim().length === 0) {
    showError('No answer detected. Please try speaking again.');
    return;
  }

  // Show the user's answer as a chat bubble
  addChatMessage('user', transcript, 'answer');

  // Disable mic while we evaluate
  micBtn.disabled = true;

  // Submit the answer for evaluation
  submitAnswer(transcript);
}

/**
 * Submit the user's answer to the backend for evaluation.
 * @param {string} userAnswer - The answer to evaluate
 */
async function submitAnswer(userAnswer) {
  if (!state.currentQuestion) return;

  setStatus('Evaluating your answer…');

  // Show loading bubble
  const loadingId = `loading-${Date.now()}`;
  addChatMessage('system', '<span class="loading-dots">Evaluating</span>', 'info', loadingId);

  try {
    const response = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answer: userAnswer,
        questionId: state.currentQuestion.id,
        difficulty: state.currentQuestion.difficulty
      })
    });

    // Remove loading bubble
    const loadingEl = document.getElementById(loadingId);
    if (loadingEl) loadingEl.remove();

    if (!response.ok) {
      const err = await response.json();
      showError(err.error || 'Failed to evaluate answer.');
      return;
    }

    const result = await response.json();
    await displayResult(result, userAnswer);

  } catch (err) {
    console.error('Error submitting answer:', err);
    const loadingEl = document.getElementById(loadingId);
    if (loadingEl) loadingEl.remove();
    showError('Could not connect to the server.');
  }
}

/**
 * Display the evaluation result in the chat.
 * @param {object} result - Evaluation result from the API
 * @param {string} userAnswer - The user's original answer
 */
async function displayResult(result, userAnswer) {
  // Update state scores
  state.scores.push(result.score);
  state.totalQuestions++;
  state.answeredIds.push(state.currentQuestion.id);
  state.averageScore = Math.round(
    state.scores.reduce((sum, s) => sum + s, 0) / state.scores.length
  );

  // Track per-difficulty scores
  const diff = state.currentQuestion.difficulty;
  state.difficultyScores[diff].push(result.score);

  // Update difficulty for next question
  state.currentDifficulty = state.currentQuestion.difficulty;

  updateStatsBar();

  // Build score badge color
  const scoreColor = result.score >= 7 ? 'green' : result.score >= 5 ? 'yellow' : 'red';

  // Build strengths/weaknesses/suggestions HTML
  const strengthsHtml = result.strengths && result.strengths.length > 0
    ? `<div class="result-section">
        <h4>✅ Strengths</h4>
        <ul class="result-list">${result.strengths.map(s => `<li>✅ ${escapeHtml(s)}</li>`).join('')}</ul>
       </div>`
    : '';

  const weaknessesHtml = result.weaknesses && result.weaknesses.length > 0
    ? `<div class="result-section">
        <h4>❌ Weaknesses</h4>
        <ul class="result-list">${result.weaknesses.map(w => `<li>❌ ${escapeHtml(w)}</li>`).join('')}</ul>
       </div>`
    : '';

  const suggestionsHtml = result.suggestions && result.suggestions.length > 0
    ? `<div class="result-section">
        <h4>💡 Suggestions</h4>
        <ul class="result-list">${result.suggestions.map(s => `<li>💡 ${escapeHtml(s)}</li>`).join('')}</ul>
       </div>`
    : '';

  const correctAnswerHtml = result.correctAnswer
    ? `<span class="correct-answer-toggle" role="button" tabindex="0" onclick="toggleCorrectAnswer(this)">📖 Show Correct Answer</span>
       <div class="correct-answer-text" style="display:none;">${escapeHtml(result.correctAnswer)}</div>`
    : '';

  const bubbleHtml = `
    <div class="result-bubble">
      <div>
        <span class="score-badge ${scoreColor}">Score: ${result.score}/10</span>
      </div>
      <p class="result-feedback">${escapeHtml(result.feedback)}</p>
      ${strengthsHtml}
      ${weaknessesHtml}
      ${suggestionsHtml}
      ${correctAnswerHtml}
    </div>
  `;

  addChatMessage('ai', bubbleHtml, 'result');

  // Speak feedback summary
  await speakText(`Your score is ${result.score} out of 10. ${result.feedback}`);

  // Show Next Question and End Interview buttons
  nextBtn.style.display = 'inline-flex';
  endBtn.style.display = 'inline-flex';
  setStatus('Press "Next Question" to continue or "End Interview" to see your results.');
}

/**
 * Toggle the correct answer visibility in the result bubble.
 * @param {HTMLElement} toggleEl - The toggle button element
 */
function toggleCorrectAnswer(toggleEl) {
  const answerDiv = toggleEl.nextElementSibling;
  if (!answerDiv) return;
  const isHidden = answerDiv.style.display === 'none';
  answerDiv.style.display = isHidden ? 'block' : 'none';
  toggleEl.textContent = isHidden ? '📖 Hide Correct Answer' : '📖 Show Correct Answer';
}

/* ============================================================
   Next Question & End Interview
   ============================================================ */

/**
 * Load the next question based on adaptive difficulty.
 */
async function nextQuestion() {
  nextBtn.style.display = 'none';
  micBtn.disabled = true;
  await fetchNextQuestion();
}

/**
 * End the interview and display the results modal.
 */
function endInterview() {
  state.sessionActive = false;

  // Cancel any ongoing speech or recording
  if (state.synthesis) state.synthesis.cancel();
  if (state.isRecording) stopRecording();

  micBtn.disabled = true;
  nextBtn.style.display = 'none';
  endBtn.style.display = 'none';
  startBtn.style.display = 'inline-flex';
  setStatus('Interview ended. See your results below.');

  const finalAvg = state.scores.length > 0
    ? Math.round(state.scores.reduce((s, v) => s + v, 0) / state.scores.length)
    : 0;

  // Score circle color
  const circleColor = finalAvg >= 7 ? 'green' : finalAvg >= 5 ? 'yellow' : 'red';
  const scoreCircle = document.getElementById('modal-score-circle');
  scoreCircle.className = `score-circle ${circleColor}`;
  document.getElementById('modal-final-score').textContent = finalAvg;

  // Rating emoji
  const ratings = [
    { min: 9, emoji: '🏆', text: 'Outstanding performance!' },
    { min: 7, emoji: '⭐', text: 'Great job!' },
    { min: 5, emoji: '👍', text: 'Decent performance. Keep practicing!' },
    { min: 0, emoji: '💪', text: 'Keep learning and try again!' }
  ];
  const rating = ratings.find(r => finalAvg >= r.min) || ratings[ratings.length - 1];
  document.getElementById('modal-rating').textContent = `${rating.emoji} ${rating.text}`;

  // Stats
  document.getElementById('modal-total-questions').textContent = state.totalQuestions;
  document.getElementById('modal-avg-score').textContent = `${finalAvg}/10`;

  // Performance breakdown by difficulty
  const breakdownContent = document.getElementById('breakdown-content');
  breakdownContent.innerHTML = '';

  ['easy', 'medium', 'hard'].forEach(diff => {
    const diffScores = state.difficultyScores[diff];
    if (diffScores.length === 0) return;

    const avg = Math.round(diffScores.reduce((s, v) => s + v, 0) / diffScores.length);
    const row = document.createElement('div');
    row.className = 'breakdown-row';
    row.innerHTML = `
      <span class="breakdown-label">${diff} (${diffScores.length} questions)</span>
      <span class="breakdown-value">${avg}/10</span>
    `;
    breakdownContent.appendChild(row);
  });

  // Show modal
  resultsModal.style.display = 'flex';
}

/* ============================================================
   UI Helpers
   ============================================================ */

/**
 * Add a message to the chat container.
 * @param {string} sender - 'ai', 'user', or 'system'
 * @param {string} content - HTML or text content
 * @param {string} type - 'question', 'result', 'answer', or 'info'
 * @param {string} [id] - Optional element ID for later reference
 */
function addChatMessage(sender, content, type, id) {
  const wrapper = document.createElement('div');
  wrapper.className = `chat-message ${sender}${type ? ' ' + type : ''}`;
  if (id) wrapper.id = id;

  let avatarEmoji = '';
  if (sender === 'ai') avatarEmoji = '🤖';
  else if (sender === 'user') avatarEmoji = '👤';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  // For result type, content is already HTML
  if (type === 'result') {
    bubble.innerHTML = content;
  } else {
    // Preserve newlines in text content
    bubble.innerHTML = escapeHtml(content).replace(/\n/g, '<br>');
  }

  // system messages don't use the avatar+bubble layout
  if (sender === 'system') {
    wrapper.appendChild(bubble);
  } else {
    if (avatarEmoji) {
      const avatarEl = document.createElement('div');
      avatarEl.className = 'avatar';
      avatarEl.setAttribute('aria-hidden', 'true');
      avatarEl.textContent = avatarEmoji;
      wrapper.appendChild(avatarEl);
    }
    wrapper.appendChild(bubble);
  }

  chatContainer.appendChild(wrapper);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

/**
 * Update the stats bar with current state values.
 */
function updateStatsBar() {
  const lastScore = state.scores.length > 0 ? state.scores[state.scores.length - 1] : null;
  document.getElementById('stat-score').textContent = lastScore !== null ? `${lastScore}/10` : '–';
  document.getElementById('stat-questions').textContent = state.totalQuestions;
  document.getElementById('stat-difficulty').textContent =
    state.sessionActive ? state.currentDifficulty : '–';
  document.getElementById('stat-average').textContent =
    state.scores.length > 0 ? `${state.averageScore}/10` : '–';
}

/**
 * Update the status bar text.
 * @param {string} message
 */
function setStatus(message) {
  statusEl.textContent = message;
}

/**
 * Display an error message in the chat and speak it.
 * @param {string} message - Error message to display
 */
async function showError(message) {
  addChatMessage('system', `⚠️ ${message}`, 'info');
  await speakText(message);
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ============================================================
   Event Listeners
   ============================================================ */

// Start interview button
startBtn.addEventListener('click', startInterview);

// Microphone toggle button
micBtn.addEventListener('click', () => {
  if (state.isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
});

// Next question button
nextBtn.addEventListener('click', nextQuestion);

// End interview button
endBtn.addEventListener('click', endInterview);

// New interview button (inside modal)
newInterviewBtn.addEventListener('click', () => {
  resultsModal.style.display = 'none';
  startInterview();
});

// Close modal on overlay click
resultsModal.addEventListener('click', (e) => {
  if (e.target === resultsModal) {
    resultsModal.style.display = 'none';
  }
});

// Text fallback submit button
if (textSubmitBtn) {
  textSubmitBtn.addEventListener('click', () => {
    const answer = textInput.value.trim();
    if (!answer) {
      showError('Please type your answer before submitting.');
      return;
    }
    textInput.value = '';
    handleTranscript(answer);
  });
}

// Allow Enter+Shift for newline in textarea, plain Enter to submit
if (textInput) {
  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      textSubmitBtn.click();
    }
  });
}

// Make correct answer toggles keyboard accessible
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.classList.contains('correct-answer-toggle')) {
    toggleCorrectAnswer(e.target);
  }
});

/* ============================================================
   Initialization
   ============================================================ */
updateStatsBar();
