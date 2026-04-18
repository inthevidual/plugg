const STORAGE_KEY = 'plugg-quiz-v1';
const QUESTIONS_PER_ROUND = 10;

let currentSubject = null;
let quizQuestions = [];
let currentIndex = 0;
let answerLocked = false;
let sessionResults = [];

// --- Storage ---
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { math: [], swedish: [] };
  } catch {
    return { math: [], swedish: [] };
  }
}

function saveSession(subject, results) {
  const history = loadHistory();
  const correct = results.filter(r => r.correctBool).length;
  history[subject].push({ ts: Date.now(), score: correct, total: results.length });
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
  window.scrollTo({ top: 0, behavior: 'instant' });
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
  const buildCard = (label, color, arr) => {
    if (!arr.length) {
      return `
        <div class="card bg-base-100/70 border border-base-300">
          <div class="card-body py-4 flex-row items-center gap-4">
            <div class="w-10 h-10 rounded-full bg-${color}/15 text-${color} flex items-center justify-center font-bold">${label[0]}</div>
            <div class="flex-1 text-left">
              <div class="text-xs uppercase tracking-widest opacity-60 font-semibold">${label}</div>
              <div class="text-sm opacity-60">Inga försök än</div>
            </div>
          </div>
        </div>`;
    }
    const last = arr[arr.length - 1];
    const avg = Math.round(arr.reduce((s, r) => s + r.score / r.total, 0) / arr.length * 100);
    return `
      <div class="card bg-base-100/70 border border-base-300">
        <div class="card-body py-4 flex-row items-center gap-4">
          <div class="w-10 h-10 rounded-full bg-${color}/15 text-${color} flex items-center justify-center font-bold">${label[0]}</div>
          <div class="flex-1 text-left">
            <div class="text-xs uppercase tracking-widest opacity-60 font-semibold">${label}</div>
            <div class="flex items-baseline gap-2 mt-0.5">
              <span class="text-2xl font-bold tabular-nums">${last.score}/${last.total}</span>
              <span class="text-sm opacity-60">senast · snitt ${avg}%</span>
            </div>
          </div>
          <div class="text-sm opacity-60 font-medium">${arr.length} försök</div>
        </div>
      </div>`;
  };
  container.innerHTML = buildCard('Matematik', 'primary', history.math) + buildCard('Svenska', 'secondary', history.swedish);
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
  return { q: row[0], options: [row[1], row[2], row[3], row[4]], correct: row[5] };
}

function startQuiz(subject) {
  currentSubject = subject;
  const pool = window.QUESTIONS[subject];
  quizQuestions = shuffle(pool).slice(0, QUESTIONS_PER_ROUND).map(parseQuestion);
  currentIndex = 0;
  sessionResults = [];
  const badge = document.getElementById('subjectBadge');
  badge.textContent = subject === 'math' ? 'Matematik' : 'Svenska';
  badge.className = 'soft-pill ' + (subject === 'math'
    ? 'bg-primary/15 text-primary ring-primary/40'
    : 'bg-secondary/15 text-secondary ring-secondary/40');
  showView('quizView');
  renderQuestion();
}

function renderQuestion() {
  const q = quizQuestions[currentIndex];
  answerLocked = false;

  const total = quizQuestions.length;
  document.getElementById('progressBar').value = currentIndex;
  document.getElementById('progressBar').max = total;
  document.getElementById('progressLabel').textContent = `Fråga ${currentIndex + 1} av ${total}`;
  document.getElementById('progressPercent').textContent = `${Math.round(currentIndex / total * 100)}%`;
  document.getElementById('questionNumber').textContent = `Fråga ${currentIndex + 1}`;
  document.getElementById('questionText').textContent = q.q;
  document.getElementById('feedback').innerHTML = '';

  const opts = document.getElementById('options');
  opts.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option-btn';
    btn.dataset.idx = i;
    btn.innerHTML = `
      <span class="option-letter">${String.fromCharCode(65 + i)}</span>
      <span class="flex-1 text-base md:text-lg leading-snug pt-1">${escapeHtml(opt)}</span>
    `;
    btn.onclick = () => selectAnswer(i);
    opts.appendChild(btn);
  });

  const nextBtn = document.getElementById('nextBtn');
  nextBtn.disabled = true;
  nextBtn.textContent = currentIndex === total - 1 ? 'Se resultat →' : 'Nästa →';
}

function selectAnswer(idx) {
  if (answerLocked) return;
  answerLocked = true;
  const q = quizQuestions[currentIndex];
  const isCorrect = idx === q.correct;

  sessionResults.push({
    q: q.q,
    chosen: idx,
    correct: q.correct,
    options: q.options,
    correctBool: isCorrect,
  });

  document.querySelectorAll('#options .option-btn').forEach((el, i) => {
    el.dataset.locked = 'true';
    el.onclick = null;
    if (i === q.correct) el.classList.add('is-correct');
    else if (i === idx) el.classList.add('is-wrong');
    else el.classList.add('is-dim');
  });

  const feedback = document.getElementById('feedback');
  if (isCorrect) {
    feedback.innerHTML = `
      <div role="alert" class="alert alert-success">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span class="font-medium">Rätt svar!</span>
      </div>`;
  } else {
    feedback.innerHTML = `
      <div role="alert" class="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
        <span>Rätt svar: <strong>${String.fromCharCode(65 + q.correct)}. ${escapeHtml(q.options[q.correct])}</strong></span>
      </div>`;
  }

  document.getElementById('nextBtn').disabled = false;
}

function nextQuestion() {
  currentIndex++;
  if (currentIndex >= quizQuestions.length) finishQuiz();
  else renderQuestion();
}

// --- Summary ---
function scoreMessage(pct) {
  if (pct === 100) return 'Felfritt — imponerande!';
  if (pct >= 80) return 'Starkt resultat!';
  if (pct >= 60) return 'Godkänt. Fortsätt öva.';
  if (pct >= 40) return 'På väg — träna vidare.';
  return 'Börja om och ta det lugnt.';
}

function finishQuiz() {
  saveSession(currentSubject, sessionResults);
  const correct = sessionResults.filter(r => r.correctBool).length;
  const wrong = sessionResults.length - correct;
  const pct = Math.round((correct / sessionResults.length) * 100);

  document.getElementById('summaryKicker').textContent = currentSubject === 'math' ? 'Matematik' : 'Svenska';
  document.getElementById('summarySubtitle').textContent = new Date().toLocaleString('sv-SE', {
    dateStyle: 'medium', timeStyle: 'short',
  });

  const radial = document.getElementById('radial');
  const color = pct >= 70 ? 'success' : pct >= 40 ? 'warning' : 'error';
  radial.style.setProperty('--value', pct);
  radial.setAttribute('aria-valuenow', pct);
  radial.className = `radial-progress my-4 text-${color}`;
  radial.innerHTML = `<span class="text-3xl font-bold tabular-nums">${pct}%</span>`;

  document.getElementById('scoreMessage').textContent = scoreMessage(pct);
  document.getElementById('scoreText').textContent = `${correct} av ${sessionResults.length} rätt`;

  document.getElementById('correctCount').textContent = correct;
  document.getElementById('wrongCount').textContent = wrong;
  const max = Math.max(correct, wrong, 1);
  const correctBar = document.getElementById('correctBar');
  const wrongBar = document.getElementById('wrongBar');
  correctBar.style.height = '0%';
  wrongBar.style.height = '0%';
  setTimeout(() => {
    correctBar.style.height = (correct / max * 100) + '%';
    wrongBar.style.height = (wrong / max * 100) + '%';
  }, 100);

  const reviewList = document.getElementById('reviewList');
  reviewList.innerHTML = sessionResults.map((r, i) => {
    const chip = r.correctBool
      ? '<span class="soft-pill bg-success/15 text-success ring-success/40">✓ Rätt</span>'
      : '<span class="soft-pill bg-error/15 text-error ring-error/40">✗ Fel</span>';
    const chosen = r.correctBool
      ? ''
      : `<div class="text-sm mt-1"><span class="opacity-60">Ditt svar:</span> <span class="text-error font-medium">${String.fromCharCode(65 + r.chosen)}. ${escapeHtml(r.options[r.chosen])}</span></div>`;
    return `
      <div class="border border-base-300 rounded-xl p-4 bg-base-200/50">
        <div class="flex items-start justify-between gap-3">
          <div class="font-medium leading-snug">${i + 1}. ${escapeHtml(r.q)}</div>
          <div class="shrink-0">${chip}</div>
        </div>
        <div class="text-sm mt-1"><span class="opacity-60">Rätt svar:</span> <strong class="text-success">${String.fromCharCode(65 + r.correct)}. ${escapeHtml(r.options[r.correct])}</strong></div>
        ${chosen}
      </div>`;
  }).join('');

  showView('summaryView');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// --- Init ---
renderMenuStats();
