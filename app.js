// App logic for YH Förberedande Test
const STORAGE_KEY = 'plugg-quiz-v1';
const QUESTIONS_PER_ROUND = 10;

let currentSubject = null;
let quizQuestions = [];
let currentIndex = 0;
let selectedAnswer = null;
let answerLocked = false;
let sessionResults = [];

// --- Storage ---
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { math: [], swedish: [] };
  } catch { return { math: [], swedish: [] }; }
}

function saveSession(subject, results) {
  const history = loadHistory();
  const correct = results.filter(r => r.correct).length;
  history[subject].push({
    ts: Date.now(),
    score: correct,
    total: results.length,
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function resetHistory() {
  if (!confirm('Rensa all historik?')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderMenuStats();
}

// --- View switching ---
function showView(id) {
  ['menuView', 'quizView', 'summaryView'].forEach(v => {
    const el = document.getElementById(v);
    el.classList.toggle('hidden', v !== id);
    if (v === id) {
      el.classList.remove('fade-in');
      void el.offsetWidth;
      el.classList.add('fade-in');
    }
  });
}

function showMenu() {
  showView('menuView');
  renderMenuStats();
}

function backToMenu() {
  if (currentIndex > 0 && currentIndex < quizQuestions.length && !confirm('Avsluta omgången? Resultatet sparas inte.')) return;
  showMenu();
}

// --- Menu stats ---
function renderMenuStats() {
  const history = loadHistory();
  const container = document.getElementById('menuStats');
  const buildStat = (label, arr) => {
    if (!arr.length) return `
      <div class="stat">
        <div class="stat-title">${label}</div>
        <div class="stat-value text-3xl">–</div>
        <div class="stat-desc">Inga försök än</div>
      </div>`;
    const last = arr[arr.length - 1];
    const avg = (arr.reduce((s, r) => s + r.score / r.total, 0) / arr.length * 100).toFixed(0);
    return `
      <div class="stat">
        <div class="stat-title">${label}</div>
        <div class="stat-value text-3xl">${last.score}/${last.total}</div>
        <div class="stat-desc">${arr.length} försök · snitt ${avg}%</div>
      </div>`;
  };
  container.innerHTML = buildStat('Matematik', history.math) + buildStat('Svenska', history.swedish);
}

// --- Quiz ---
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseQuestion(row) {
  return {
    q: row[0],
    options: [row[1], row[2], row[3], row[4]],
    correct: row[5],
  };
}

function startQuiz(subject) {
  currentSubject = subject;
  const pool = window.QUESTIONS[subject];
  quizQuestions = shuffle(pool).slice(0, QUESTIONS_PER_ROUND).map(parseQuestion);
  currentIndex = 0;
  sessionResults = [];
  document.getElementById('subjectBadge').textContent = subject === 'math' ? 'Matematik' : 'Svenska';
  document.getElementById('subjectBadge').className = 'badge badge-lg ' + (subject === 'math' ? 'badge-primary' : 'badge-secondary');
  showView('quizView');
  renderQuestion();
}

function renderQuestion() {
  const q = quizQuestions[currentIndex];
  selectedAnswer = null;
  answerLocked = false;

  document.getElementById('progressBar').value = currentIndex;
  document.getElementById('progressBar').max = quizQuestions.length;
  document.getElementById('progressLabel').textContent = `Fråga ${currentIndex + 1} av ${quizQuestions.length}`;
  document.getElementById('questionNumber').textContent = `Fråga ${currentIndex + 1}`;
  document.getElementById('questionText').textContent = q.q;
  document.getElementById('feedback').innerHTML = '';

  const opts = document.getElementById('options');
  opts.innerHTML = '';
  q.options.forEach((opt, i) => {
    const label = document.createElement('label');
    label.className = 'btn btn-outline btn-lg justify-start text-left h-auto py-3 normal-case whitespace-normal';
    label.dataset.idx = i;
    label.innerHTML = `
      <span class="font-bold mr-3 text-primary">${String.fromCharCode(65 + i)}.</span>
      <span class="flex-1">${opt}</span>
    `;
    label.onclick = () => selectAnswer(i);
    opts.appendChild(label);
  });

  const nextBtn = document.getElementById('nextBtn');
  nextBtn.disabled = true;
  nextBtn.textContent = currentIndex === quizQuestions.length - 1 ? 'Se resultat →' : 'Nästa →';
}

function selectAnswer(idx) {
  if (answerLocked) return;
  answerLocked = true;
  selectedAnswer = idx;
  const q = quizQuestions[currentIndex];
  const isCorrect = idx === q.correct;

  sessionResults.push({
    q: q.q,
    chosen: idx,
    correct: q.correct,
    options: q.options,
    correctBool: isCorrect,
  });

  document.querySelectorAll('#options label').forEach((el, i) => {
    el.classList.remove('btn-outline');
    el.onclick = null;
    if (i === q.correct) {
      el.classList.add('btn-success');
    } else if (i === idx) {
      el.classList.add('btn-error');
    } else {
      el.classList.add('btn-disabled', 'opacity-50');
    }
  });

  const feedback = document.getElementById('feedback');
  if (isCorrect) {
    feedback.innerHTML = `<div role="alert" class="alert alert-success">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>Rätt svar!</span>
    </div>`;
  } else {
    feedback.innerHTML = `<div role="alert" class="alert alert-error">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
      <span>Fel. Rätt svar är <strong>${String.fromCharCode(65 + q.correct)}: ${q.options[q.correct]}</strong>.</span>
    </div>`;
  }

  document.getElementById('nextBtn').disabled = false;
}

function nextQuestion() {
  currentIndex++;
  if (currentIndex >= quizQuestions.length) {
    finishQuiz();
  } else {
    renderQuestion();
  }
}

// --- Summary ---
function finishQuiz() {
  saveSession(currentSubject, sessionResults);
  const correct = sessionResults.filter(r => r.correctBool).length;
  const wrong = sessionResults.length - correct;
  const pct = Math.round((correct / sessionResults.length) * 100);

  document.getElementById('summarySubtitle').textContent =
    (currentSubject === 'math' ? 'Matematik' : 'Svenska') + ' · ' + new Date().toLocaleString('sv-SE');

  const radial = document.getElementById('radial');
  radial.style.setProperty('--value', pct);
  radial.setAttribute('aria-valuenow', pct);
  radial.className = 'radial-progress my-4 ' + (pct >= 70 ? 'text-success' : pct >= 40 ? 'text-warning' : 'text-error');
  radial.innerHTML = `<span class="text-3xl font-bold">${pct}%</span>`;

  document.getElementById('summaryStats').innerHTML = `
    <div class="stat">
      <div class="stat-title">Rätt</div>
      <div class="stat-value text-success">${correct}</div>
    </div>
    <div class="stat">
      <div class="stat-title">Fel</div>
      <div class="stat-value text-error">${wrong}</div>
    </div>
    <div class="stat">
      <div class="stat-title">Totalt</div>
      <div class="stat-value">${sessionResults.length}</div>
    </div>
  `;

  document.getElementById('correctCount').textContent = correct;
  document.getElementById('wrongCount').textContent = wrong;

  const max = Math.max(correct, wrong, 1);
  const correctBar = document.getElementById('correctBar');
  const wrongBar = document.getElementById('wrongBar');
  // reset then animate
  correctBar.style.height = '0%';
  wrongBar.style.height = '0%';
  setTimeout(() => {
    correctBar.style.height = (correct / max * 100) + '%';
    wrongBar.style.height = (wrong / max * 100) + '%';
  }, 80);

  const reviewList = document.getElementById('reviewList');
  reviewList.innerHTML = sessionResults.map((r, i) => {
    const icon = r.correctBool
      ? '<span class="badge badge-success gap-2">✓ Rätt</span>'
      : '<span class="badge badge-error gap-2">✗ Fel</span>';
    const chosen = r.correctBool
      ? ''
      : `<div class="text-sm text-error mt-1">Ditt svar: ${String.fromCharCode(65 + r.chosen)}. ${r.options[r.chosen]}</div>`;
    return `
      <div class="border border-base-300 rounded-lg p-3 bg-base-200">
        <div class="flex items-start justify-between gap-2">
          <div class="font-medium">${i + 1}. ${escapeHtml(r.q)}</div>
          ${icon}
        </div>
        <div class="text-sm mt-1">Rätt svar: <strong>${String.fromCharCode(65 + r.correct)}. ${escapeHtml(r.options[r.correct])}</strong></div>
        ${chosen}
      </div>
    `;
  }).join('');

  showView('summaryView');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// --- Init ---
renderMenuStats();
