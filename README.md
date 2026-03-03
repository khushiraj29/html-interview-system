# 🎤 AI-Powered Voice-Based HTML Interview System

An AI-driven, voice-enabled mock interview system that simulates a real-time HTML technical interview experience. Built with Node.js, Express, and the Web Speech API.

---

## ✨ Features

- **Voice Input & Output** — Uses the Web Speech API for both speech recognition (microphone answers) and speech synthesis (AI speaks questions aloud)
- **Adaptive Difficulty** — Automatically adjusts question difficulty (easy → medium → hard) based on your running average score
- **AI-Powered Scoring** — Keyword-based semantic similarity engine evaluates answers and returns detailed feedback
- **Chat-Style UI** — Modern dark-themed chat interface with AI and user bubbles, live transcript preview
- **30+ HTML Questions** — Covers easy (basic HTML), medium (HTML5 APIs, forms, accessibility), and hard (Shadow DOM, Web Components, Service Workers, CSP, CORS)
- **Detailed Feedback** — Each answer receives a score (0–10), strengths, weaknesses, suggestions, and the full correct answer
- **Results Summary** — End-of-session modal with average score, performance breakdown by difficulty
- **Text Input Fallback** — If the browser doesn't support the Web Speech API, a textarea is shown for typed answers
- **Responsive Design** — Works on desktop and mobile browsers

---

## 🛠 Tech Stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Backend  | Node.js, Express.js                     |
| Frontend | Vanilla HTML5, CSS3, JavaScript (ES6+)  |
| Speech   | Web Speech API (SpeechRecognition + SpeechSynthesis) |
| Styling  | CSS custom properties, Inter font       |
| Data     | JSON question bank (33 questions)       |

---

## 📁 Project Structure

```
html-interview-system/
├── server.js              # Express backend
├── package.json           # Project metadata and dependencies
├── README.md
├── data/
│   └── questions.json     # 33 HTML interview questions
├── utils/
│   ├── evaluator.js       # Keyword-based answer scoring engine
│   └── adaptive.js        # Adaptive difficulty selection logic
└── public/
    ├── index.html         # Chat-style interview UI
    ├── style.css          # Dark-themed responsive CSS
    └── app.js             # Frontend JavaScript logic
```

---

## 🚀 Installation & Usage

### Prerequisites
- Node.js >= 14.0.0

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/khushiraj29/html-interview-system.git
cd html-interview-system

# 2. Install dependencies
npm install

# 3. Start the server
npm start
# For development with auto-reload:
npm run dev

# 4. Open in browser
# Navigate to http://localhost:3000
```

### Usage Guide

1. Open `http://localhost:3000` in a modern browser (Chrome recommended for best speech support)
2. Click **▶ Start Interview** to begin
3. The AI will greet you and ask the first question (spoken aloud)
4. Click the **🎤 microphone button** to start recording your answer
5. Speak your answer clearly — you'll see a live transcript
6. The system automatically evaluates your answer and shows:
   - Score (0–10)
   - Personalized feedback
   - Strengths ✅, Weaknesses ❌, and Suggestions 💡
   - Toggle to reveal the full correct answer
7. Click **Next Question ➜** for the next question
8. The difficulty adapts based on your performance:
   - Average ≥ 8 → upgrades difficulty
   - Average ≤ 4 → downgrades difficulty
9. Click **✖ End Interview** to see your complete results summary

---

## 📡 API Documentation

### `POST /api/evaluate`
Evaluate a user's answer to a question.

**Request body:**
```json
{
  "answer": "The DOCTYPE declaration tells the browser...",
  "questionId": 1,
  "difficulty": "easy"
}
```

**Response:**
```json
{
  "score": 7,
  "feedback": "Good answer! You correctly covered: doctype, browser, standards mode.",
  "strengths": ["Mentioned \"doctype\"", "Mentioned \"browser\""],
  "weaknesses": ["Did not mention \"quirks mode\""],
  "suggestions": ["Try to also cover: quirks mode, html version"],
  "correctAnswer": "The DOCTYPE declaration tells the browser...",
  "keywords": ["doctype", "browser", "standards mode"]
}
```

---

### `GET /api/questions`
Returns all questions grouped by difficulty.

**Response:**
```json
{
  "easy": [...],
  "medium": [...],
  "hard": [...]
}
```

---

### `GET /api/question/:id`
Returns a single question by ID.

---

### `POST /api/next-question`
Returns the next question using adaptive difficulty selection.

**Request body:**
```json
{
  "currentDifficulty": "easy",
  "averageScore": 8,
  "answeredIds": [1, 3, 5]
}
```

**Response:** A single question object.

---

## 📸 Screenshots

> *Run the app locally and navigate to http://localhost:3000 to see the interface.*

---

## 📝 License

MIT
