/**
 * server.js
 * Express.js backend for the AI-Powered Voice-Based HTML Interview System.
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const { evaluateAnswer } = require('./utils/evaluator');
const { getNextQuestion } = require('./utils/adaptive');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load questions from data file
const questionsPath = path.join(__dirname, 'data', 'questions.json');
let questions;
try {
  questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
} catch (err) {
  console.error(`Failed to load questions from ${questionsPath}: ${err.message}`);
  process.exit(1);
}

/**
 * POST /api/evaluate
 * Evaluate a user's answer to a question.
 * Body: { answer, questionId, difficulty }
 */
app.post('/api/evaluate', (req, res) => {
  const { answer, questionId, difficulty } = req.body;

  if (!answer || questionId === undefined) {
    return res.status(400).json({ error: 'Missing required fields: answer, questionId' });
  }

  const question = questions.find(q => q.id === Number(questionId));
  if (!question) {
    return res.status(404).json({ error: `Question with id ${questionId} not found` });
  }

  const result = evaluateAnswer(answer, question);
  return res.json(result);
});

/**
 * GET /api/questions
 * Returns all questions grouped by difficulty.
 */
app.get('/api/questions', (req, res) => {
  const grouped = {
    easy: questions.filter(q => q.difficulty === 'easy'),
    medium: questions.filter(q => q.difficulty === 'medium'),
    hard: questions.filter(q => q.difficulty === 'hard')
  };
  res.json(grouped);
});

/**
 * GET /api/question/:id
 * Returns a single question by id.
 */
app.get('/api/question/:id', (req, res) => {
  const id = Number(req.params.id);
  const question = questions.find(q => q.id === id);
  if (!question) {
    return res.status(404).json({ error: `Question with id ${id} not found` });
  }
  res.json(question);
});

/**
 * POST /api/next-question
 * Returns the next adaptive question.
 * Body: { currentDifficulty, averageScore, answeredIds }
 */
app.post('/api/next-question', (req, res) => {
  const { currentDifficulty, averageScore, answeredIds } = req.body;

  const difficulty = currentDifficulty || 'easy';
  const score = typeof averageScore === 'number' ? averageScore : 0;
  const answered = Array.isArray(answeredIds) ? answeredIds : [];

  const nextQuestion = getNextQuestion(difficulty, score, answered, questions);
  if (!nextQuestion) {
    return res.status(404).json({ error: 'No more questions available' });
  }
  res.json(nextQuestion);
});

// Start the server
app.listen(PORT, () => {
  console.log(`HTML Interview System server running on http://localhost:${PORT}`);
});

module.exports = app;
