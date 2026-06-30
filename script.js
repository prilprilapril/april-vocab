const WORDS = window.APRIL_WORDS || [];
const TOTAL_DAYS = 45;
const ACTIVE_DAYS = [...new Set(WORDS.map(w => w.day))];

let currentWords = [];
let index = 0;
let view = "front";
let mode = "day"; // day | review
let reviewSourceDay = null;
let returnState = null;

const reviewKey = "april_vocab_review_words_v2";
let reviewSet = new Set(JSON.parse(localStorage.getItem(reviewKey) || "[]"));

const $ = id => document.getElementById(id);

function dayName(n) {
  return `DAY ${String(n).padStart(2, "0")}`;
}
function show(e) { e.classList.remove("hidden"); }
function hide(e) { e.classList.add("hidden"); }

function init() {
  buildToc();
  openToc();
}

function buildToc() {
  const grid = $("tocGrid");
  grid.innerHTML = "";
  for (let i = 1; i <= TOTAL_DAYS; i++) {
    const day = dayName(i);
    const b = document.createElement("button");
    b.className = "day-tile";
    b.textContent = day;
    b.disabled = !ACTIVE_DAYS.includes(day);
    if (ACTIVE_DAYS.includes(day)) b.addEventListener("click", () => openDay(day));
    grid.appendChild(b);
  }
}

function openToc() {
  mode = "day";
  reviewSourceDay = null;
  returnState = null;
  show($("tocView"));
  hide($("cardView"));
  hide($("reviewView"));
}

function openReview() {
  hide($("tocView"));
  hide($("cardView"));
  show($("reviewView"));
}

function openDay(day, list = null, options = {}) {
  currentWords = list || WORDS.filter(w => w.day === day);
  index = options.startIndex || 0;
  view = "front";
  mode = list ? "review" : "day";
  reviewSourceDay = options.reviewSourceDay || (list && currentWords[0] ? currentWords[0].day : null);
  if (!list) returnState = null;

  hide($("tocView"));
  show($("cardView"));
  hide($("reviewView"));
  render();
}

function current() {
  return currentWords[index];
}

function reviewLabel(w) {
  if (reviewSourceDay) return `${reviewSourceDay} REVIEW`;
  return w && w.day ? `${w.day} REVIEW` : "REVIEW";
}

function render() {
  const w = current();
  if (!w) return;

  $("frontWord").textContent = w.word;
  $("part").textContent = w.part ? `(${w.part})` : "";
  $("meaningKo").textContent = w.ko;
  $("definitionEn").textContent = w.def || "";
  $("synonyms").textContent = (w.syn || []).join(", ");
  $("antonyms").textContent = (w.ant || []).join(", ");

  $("dayLabel").textContent = mode === "review" ? reviewLabel(w) : w.day;
  $("counter").textContent = `${index + 1} / ${currentWords.length}`;

  const inReview = reviewSet.has(w.id);
  $("addReviewBtn").textContent = mode === "review" ? "추가해제" : (inReview ? "추가완료" : "복습추가");
  $("addReviewBtn").classList.toggle("active", mode !== "review" && inReview);
  $("addReviewBtn").classList.toggle("review-remove", mode === "review");
  $("homeBtn").classList.toggle("close-button", mode === "review");

  $("exampleList").innerHTML = (w.examples || [])
    .map((ex, i) => `<p class="example-item"><button class="example-sound" data-i="${i}">▷</button>${highlight(escapeHtml(ex), w.word)}</p>`)
    .join("");
  $("forms").textContent = (w.forms || []).join("  /  ");

  $("front").classList.toggle("hidden", view !== "front");
  $("definition").classList.toggle("hidden", view !== "definition");
  $("examples").classList.toggle("hidden", view !== "examples");
}

function escapeHtml(s) {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function highlight(text, word) {
  const re = new RegExp(`\\b(${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(s|d|ed|ing)?\\b`, "gi");
  return text.replace(re, `<span class="highlight">$&</span>`);
}

function flip() {
  if (view === "front") view = "definition";
  else if (view === "definition") view = "front";
  render();
}

function go(n) {
  index = (index + n + currentWords.length) % currentWords.length;
  render();
}

function speak(text, rate = .82) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = rate;
  speechSynthesis.speak(u);
}

function saveReviewSet() {
  localStorage.setItem(reviewKey, JSON.stringify([...reviewSet]));
}

function toggleReview() {
  const w = current();
  if (!w) return;

  if (mode === "review") {
    reviewSet.delete(w.id);
    saveReviewSet();
    currentWords = currentWords.filter(item => item.id !== w.id);

    if (!currentWords.length) {
      alert("이 리뷰에 남은 단어가 없어요.");
      returnToStudy();
      return;
    }
    if (index >= currentWords.length) index = currentWords.length - 1;
    view = "front";
    render();
    return;
  }

  if (reviewSet.has(w.id)) reviewSet.delete(w.id);
  else reviewSet.add(w.id);
  saveReviewSet();
  render();
}

function dayReview() {
  const w = current();
  const day = w.day;
  const list = WORDS.filter(item => item.day === day && reviewSet.has(item.id));
  if (!list.length) {
    alert(`${day}에서 복습추가한 단어가 아직 없어요.`);
    return;
  }
  returnState = { day, index };
  openDay(day, list, { reviewSourceDay: day });
}

function cumulativeReview() {
  const list = WORDS.filter(w => reviewSet.has(w.id));
  if (!list.length) {
    alert("복습추가한 단어가 아직 없어요.");
    return;
  }
  returnState = null;
  openDay("REVIEW", list, { reviewSourceDay: null });
}

function returnToStudy() {
  if (mode !== "review") {
    openToc();
    return;
  }

  const target = returnState || (current() ? { day: current().day, index: 0 } : null);
  if (!target) {
    openToc();
    return;
  }

  const dayWords = WORDS.filter(w => w.day === target.day);
  currentWords = dayWords;
  index = Math.min(target.index || 0, Math.max(dayWords.length - 1, 0));
  view = "front";
  mode = "day";
  reviewSourceDay = null;
  returnState = null;
  hide($("tocView"));
  show($("cardView"));
  hide($("reviewView"));
  render();
}

$("card").addEventListener("click", e => {
  if (e.target.closest("button")) return;
  if (view !== "examples") flip();
});
$("soundBtn").addEventListener("click", e => {
  e.stopPropagation();
  speak(current().word, .78);
});
$("exampleBtn").addEventListener("click", e => {
  e.stopPropagation();
  view = "examples";
  render();
});
$("backDefBtn").addEventListener("click", e => {
  e.stopPropagation();
  view = "definition";
  render();
});
$("prevBtn").addEventListener("click", () => go(-1));
$("nextBtn").addEventListener("click", () => go(1));
$("homeBtn").addEventListener("click", returnToStudy);
$("reviewHomeBtn").addEventListener("click", openReview);
$("reviewBackBtn").addEventListener("click", openToc);
$("addReviewBtn").addEventListener("click", toggleReview);
$("dayReviewBtn").addEventListener("click", dayReview);
$("cumulativeBtn").addEventListener("click", cumulativeReview);

document.addEventListener("click", e => {
  const b = e.target.closest(".example-sound");
  if (!b) return;
  e.stopPropagation();
  speak(current().examples[Number(b.dataset.i)], .82);
});

document.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft") go(-1);
  if (e.key === "ArrowRight") go(1);
  if (e.code === "Space" && view !== "examples") {
    e.preventDefault();
    flip();
  }
  if (e.key === "Escape") {
    if (view === "examples") {
      view = "definition";
      render();
    } else if (mode === "review") {
      returnToStudy();
    }
  }
});

init();
