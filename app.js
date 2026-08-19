/* =========================================================
   HỌC TIẾNG ĐỨC A1-A2 - JS HOÀN CHỈNH
   ========================================================= */

const API_URL = "https://script.google.com/macros/s/AKfycbxKDBNJ5OKpZ-YsslFNOCIVn1qAp4LDW25ShEuowDHqAI5LOGDqPu8-KB6jXeYhPi1-/exec";

let currentSheet = "tiengDucA1";
let allData = [];
let filteredData = [];
let currentPage = 1;
const rowsPerPage = 50;

let practiceWords = [];
let practiceRawData = [];

/* ---------- Web Speech API ---------- */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "de-DE"; // Thu âm & Nhận dạng giọng nói chuẩn tiếng Đức
  recognition.continuous = false;
  recognition.interimResults = false;
}

/* ---------- Helpers ---------- */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message, type = "primary") {
  const toastEl = document.getElementById("liveToast");
  const msgEl = document.getElementById("toastMessage");
  if (!toastEl || !msgEl) {
    alert(message);
    return;
  }
  toastEl.className = `toast align-items-center text-white border-0 shadow bg-${type}`;
  msgEl.textContent = message;
  bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3000 }).show();
}

function setLoading(show) {
  const el = document.getElementById("loading");
  if (el) el.style.display = show ? "block" : "none";
}

async function apiGet(sheetName) {
  const url = `${API_URL}?sheet=${encodeURIComponent(sheetName)}&_=${Date.now()}`;
  const response = await fetch(url, { method: "GET", cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result = await response.json();
  if (result.status === "error") throw new Error(result.message || "API lỗi");
  return Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);
}

async function apiPost(payload) {
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result = await response.json();
  if (result.status !== "success") throw new Error(result.message || "API lỗi");
  return result;
}

/* ---------- Navigation ---------- */

function switchView(view) {
  const vocab = document.getElementById("vocabView");
  const practice = document.getElementById("practiceView");
  const tabVocab = document.getElementById("tabVocabulary");
  const tabPractice = document.getElementById("tabPractice");

  if (view === "practice") {
    vocab.classList.add("d-none");
    practice.classList.remove("d-none");
    tabVocab.classList.remove("active");
    tabPractice.classList.add("active");
    loadPracticeTopics();
  } else {
    practice.classList.add("d-none");
    vocab.classList.remove("d-none");
    tabPractice.classList.remove("active");
    tabVocab.classList.add("active");
  }
}

/* ---------- Vocabulary View ---------- */

document.addEventListener("DOMContentLoaded", () => {
  const level = document.getElementById("filterLevel");
  if (level) currentSheet = level.value || "tiengDucA1";
  loadData();
});

function changeLevel(level) {
  currentSheet = level || "tiengDucA1";
  currentPage = 1;

  const filterLevel = document.getElementById("filterLevel");
  if (filterLevel) filterLevel.value = currentSheet;

  loadData();
}

async function loadData() {
  setLoading(true);
  const tbody = document.getElementById("tableBody");
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center py-5">
          <div class="spinner-border text-primary-custom"></div>
          <div class="mt-2 text-muted">Đang tải dữ liệu...</div>
        </td>
      </tr>`;
  }

  try {
    allData = await apiGet(currentSheet);
    populateTopics();
    applyFilters();
  } catch (error) {
    console.error(error);
    allData = [];
    filteredData = [];
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="text-center text-danger py-5">
            <i class="fa-solid fa-triangle-exclamation fa-2x mb-2"></i>
            <div>Không tải được dữ liệu.</div>
            <small>${escapeHtml(error.message)}</small>
          </td>
        </tr>`;
    }
    showToast("Không thể kết nối Google Sheets.", "danger");
  } finally {
    setLoading(false);
  }
}

function populateTopics() {
  const select = document.getElementById("filterTopic");
  if (!select) return;

  const oldValue = select.value;
  const topics = [...new Set(allData.map(x => x.chuDe).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "vi"));

  select.innerHTML = `<option value="">-- Tất cả chủ đề --</option>`;
  topics.forEach(topic => {
    select.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(topic)}">${escapeHtml(topic)}</option>`);
  });

  if (topics.includes(oldValue)) select.value = oldValue;
}

function applyFilters() {
  const keyword = (document.getElementById("searchKeyword")?.value || "").trim().toLowerCase();
  const topic = document.getElementById("filterTopic")?.value || "";

  filteredData = allData.filter(item => {
    const matchesTopic = !topic || item.chuDe === topic;
    if (!matchesTopic) return false;

    if (!keyword) return true;

    const haystack = [
      item.chuDe, item.tiengDuc, item.ipa, item.tuLoai,
      item.maoTu, item.soNhieu, item.nghiaTV, item.viDu, item.dichViDu
    ].join(" ").toLowerCase();

    return haystack.includes(keyword);
  });

  currentPage = 1;
  displayData();
}

function displayData() {
  const tbody = document.getElementById("tableBody");
  if (!tbody) return;

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * rowsPerPage;
  const pageData = filteredData.slice(start, start + rowsPerPage);

  if (pageData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-5">Không tìm thấy dữ liệu.</td></tr>`;
    renderPagination(0, 0, 0);
    return;
  }

  tbody.innerHTML = pageData.map((item, index) => `
    <tr>
      <td class="text-center">${start + index + 1}</td>
      <td><span class="badge bg-secondary">${escapeHtml(item.chuDe)}</span></td>
      <td class="fw-bold text-primary-custom">
        <div class="d-flex align-items-center justify-content-between gap-1">
          <span>
            ${item.maoTu ? `<small class="text-muted fw-normal">(${escapeHtml(item.maoTu)})</small> ` : ""}
            ${escapeHtml(item.tiengDuc)}
          </span>
          ${item.tiengDuc ? `
            <button class="btn btn-sm btn-speak p-0 border-0"
                    data-text="${encodeURIComponent(item.tiengDuc)}"
                    onclick="speakGerman(this)" title="Nghe đọc mẫu">
              <i class="fa-solid fa-volume-high"></i>
            </button>` : ""}
        </div>
      </td>
      <td>${escapeHtml(item.ipa)}</td>
      <td>${escapeHtml(item.tuLoai)}</td>
      <td>${escapeHtml(item.maoTu)}</td>
      <td>${escapeHtml(item.soNhieu)}</td>
      <td>${escapeHtml(item.nghiaTV)}</td>
      <td>${escapeHtml(item.viDu)}</td>
      <td>${escapeHtml(item.dichViDu)}</td>
    </tr>
  `).join("");

  renderPagination(filteredData.length, currentPage, totalPages);
}

function renderPagination(total, page, totalPages) {
  const pagination = document.getElementById("pagination");
  const pageInfo = document.getElementById("pageInfo");
  if (!pagination || !pageInfo) return;

  if (!total) {
    pageInfo.textContent = "Không có dữ liệu";
    pagination.innerHTML = "";
    return;
  }

  const start = (page - 1) * rowsPerPage + 1;
  const end = Math.min(page * rowsPerPage, total);
  pageInfo.textContent = `Hiển thị ${start}-${end} / ${total}`;

  const buttons = [];
  buttons.push(`<li class="page-item ${page === 1 ? "disabled" : ""}"><button class="page-link" onclick="goToPage(${page - 1})">‹</button></li>`);

  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
      buttons.push(`<li class="page-item ${p === page ? "active" : ""}"><button class="page-link" onclick="goToPage(${p})">${p}</button></li>`);
    } else if (buttons[buttons.length - 1] !== '<li class="page-item disabled"><span class="page-link">…</span></li>') {
      buttons.push(`<li class="page-item disabled"><span class="page-link">…</span></li>`);
    }
  }

  buttons.push(`<li class="page-item ${page === totalPages ? "disabled" : ""}"><button class="page-link" onclick="goToPage(${page + 1})">›</button></li>`);
  pagination.innerHTML = buttons.join("");
}

function goToPage(page) {
  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  displayData();
}

function speakGerman(button) {
  const text = decodeURIComponent(button.dataset.text || "");
  if (!text || !("speechSynthesis" in window)) {
    showToast("Trình duyệt không hỗ trợ đọc âm thanh.", "warning");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
}

/* ---------- Practice & Record Section ---------- */

async function getPracticeData(level) {
  return await apiGet(level);
}

async function loadPracticeTopics() {
  const level = document.getElementById("practiceLevel")?.value || "tiengDucA1";
  const select = document.getElementById("practiceTopic");
  if (!select) return;

  try {
    const data = await getPracticeData(level);
    practiceRawData = data;

    const topics = [...new Set(data.map(item => item.chuDe).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "vi"));

    select.innerHTML = `<option value="">-- Tất cả chủ đề --</option>`;
    topics.forEach(topic => {
      select.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(topic)}">${escapeHtml(topic)}</option>`);
    });
  } catch (error) {
    console.error(error);
  }
}

async function startPractice() {
  const level = document.getElementById("practiceLevel").value;
  const topic = document.getElementById("practiceTopic").value;
  const tbody = document.getElementById("practiceTableBody");

  tbody.innerHTML = `
    <tr><td colspan="6" class="text-center py-5">
      <div class="spinner-border text-primary-custom"></div>
      <div class="mt-2 text-muted">Đang khởi tạo bài tập...</div>
    </td></tr>`;

  try {
    const data = await getPracticeData(level);
    practiceRawData = data;

    let filtered = topic ? data.filter(item => item.chuDe === topic) : data;

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Không tìm thấy dữ liệu.</td></tr>`;
      practiceWords = [];
      updateScoreboard(0, 0, 0, 0);
      return;
    }

    practiceWords = [...filtered].sort(() => Math.random() - 0.5).slice(0, 50);
    renderPracticeTable();
    document.getElementById("btnSubmitPractice").disabled = false;
    updateScoreboard(0, 0, practiceWords.length, 0);
    showToast(`Đã tạo ${practiceWords.length} câu bài tập!`, "success");
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Lỗi: ${escapeHtml(error.message)}</td></tr>`;
  }
}

/* RENDER CỘT GHI ÂM VÀ THU ÂM CHUẨN ĐÚNG NÓI */
function renderPracticeTable() {
  const tbody = document.getElementById("practiceTableBody");
  if (!tbody) return;

  tbody.innerHTML = practiceWords.map((item, index) => `
    <tr id="practiceRow_${index}">
      <td class="text-center fw-bold">${index + 1}</td>
      <td><span class="badge bg-secondary">${escapeHtml(item.chuDe)}</span></td>
      <td class="fw-bold text-primary-custom">
        <div class="d-flex align-items-center justify-content-between gap-1">
          <div>
            <div>
              ${item.maoTu ? `<small class="text-muted fw-normal">(${escapeHtml(item.maoTu)})</small> ` : ""}
              ${escapeHtml(item.tiengDuc)}
            </div>
            <small class="text-muted fst-italic font-monospace" style="font-size:0.8rem;">
              ${escapeHtml(item.ipa || "")}
            </small>
          </div>
          <button class="btn btn-sm btn-speak p-0 border-0"
                  data-text="${encodeURIComponent(item.tiengDuc || "")}"
                  onclick="speakGerman(this)" title="Nghe mẫu">
            <i class="fa-solid fa-volume-high"></i>
          </button>
        </div>
      </td>
      <td>
        <input type="text" class="form-control form-control-sm practice-input"
               id="input_${index}"
               placeholder="Nhập nghĩa tiếng Việt..."
               autocomplete="off"
               onkeyup="handlePracticeKeyup(event, ${index})"
               onchange="checkSingleAnswer(${index})">
      </td>
      <!-- Cột Thu Âm & Chấm Điểm Phát Âm -->
      <td>
        <div class="d-flex align-items-center justify-content-center gap-2">
          <button class="btn btn-sm btn-outline-danger" id="btnRecord_${index}" onclick="toggleRecord(${index})" title="Bấm để phát âm thử">
            <i class="fa-solid fa-microphone"></i>
          </button>
          <div class="text-start flex-grow-1" style="line-height: 1.2;">
            <div id="speechText_${index}" class="small text-muted fst-italic" style="min-height: 18px;">Chưa ghi âm</div>
            <div id="speechMatch_${index}"></div>
          </div>
        </div>
      </td>
      <td class="text-center practice-result" id="result_${index}">
        <span class="badge bg-light text-dark border">Chưa làm</span>
      </td>
    </tr>
  `).join("");
}

/* ---------- Thu Âm và Nhận Dạng Giọng Nói ---------- */

function toggleRecord(index) {
  if (!recognition) {
    showToast("Trình duyệt không hỗ trợ Web Speech API. Vui lòng dùng Google Chrome.", "warning");
    return;
  }

  const btn = document.getElementById(`btnRecord_${index}`);
  const statusText = document.getElementById(`speechText_${index}`);
  const targetWord = practiceWords[index]?.tiengDuc || "";

  btn.className = "btn btn-sm btn-danger";
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
  statusText.textContent = "Đang nghe...";

  recognition.start();

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    statusText.textContent = `"${transcript}"`;
    verifyPronunciation(index, transcript, targetWord);
  };

  recognition.onerror = () => {
    statusText.textContent = "Lỗi nhận diện / Không thấy mic";
    resetRecordButton(index);
  };

  recognition.onend = () => {
    resetRecordButton(index);
  };
}

function resetRecordButton(index) {
  const btn = document.getElementById(`btnRecord_${index}`);
  if (btn) {
    btn.className = "btn btn-sm btn-outline-danger";
    btn.innerHTML = `<i class="fa-solid fa-microphone"></i>`;
  }
}

function verifyPronunciation(index, transcript, targetWord) {
  const matchContainer = document.getElementById(`speechMatch_${index}`);
  if (!matchContainer) return;

  const cleanTranscript = normalizeGermanText(transcript);
  const cleanTarget = normalizeGermanText(targetWord);

  const similarity = calculateSimilarity(cleanTranscript, cleanTarget);

  if (similarity >= 0.85 || cleanTranscript === cleanTarget) {
    matchContainer.innerHTML = `<span class="badge bg-success" style="font-size:0.7rem;"><i class="fa-solid fa-check me-1"></i>Chuẩn (${Math.round(similarity * 100)}%)</span>`;
  } else if (similarity >= 0.5) {
    matchContainer.innerHTML = `<span class="badge bg-warning text-dark" style="font-size:0.7rem;"><i class="fa-solid fa-triangle-exclamation me-1"></i>Gần đúng (${Math.round(similarity * 100)}%)</span>`;
  } else {
    matchContainer.innerHTML = `<span class="badge bg-danger" style="font-size:0.7rem;"><i class="fa-solid fa-xmark me-1"></i>Sai (${Math.round(similarity * 100)}%)</span>`;
  }
}

function normalizeGermanText(text) {
  return String(text || "").toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
}

function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const track = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= str2.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator,
      );
    }
  }

  const maxLength = Math.max(str1.length, str2.length);
  return (maxLength - track[str2.length][str1.length]) / maxLength;
}

/* ---------- Chấm điểm Nghĩa Tiếng Việt ---------- */

function handlePracticeKeyup(event, index) {
  if (event.key === "Enter") {
    event.preventDefault();
    checkSingleAnswer(index);
    const nextInput = document.getElementById(`input_${index + 1}`);
    if (nextInput) nextInput.focus();
    else checkAllAnswers();
  }
}

function normalizeText(str) {
  if (!str) return "";
  return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/[\/(),;.\-]/g, " ").replace(/\s+/g, " ");
}

function isAnswerCorrect(userAns, targetAns) {
  if (!userAns || !targetAns) return false;

  const user = normalizeText(userAns);
  const target = normalizeText(targetAns);

  if (user === target) return true;

  const meanings = String(targetAns).split(/[,;\/\(\)]+/).map(x => normalizeText(x)).filter(Boolean);
  return meanings.some(m => m === user || (user.length >= 2 && m.includes(user)));
}

function checkSingleAnswer(index) {
  const input = document.getElementById(`input_${index}`);
  const result = document.getElementById(`result_${index}`);
  if (!input || !result || !practiceWords[index]) return;

  const userVal = input.value.trim();

  if (!userVal) {
    result.innerHTML = `<span class="badge bg-light text-dark border">Chưa làm</span>`;
    input.classList.remove("is-valid", "is-invalid");
    recalculateScore();
    return;
  }

  const correctVal = practiceWords[index].nghiaTV || "";
  const correct = isAnswerCorrect(userVal, correctVal);

  input.classList.toggle("is-valid", correct);
  input.classList.toggle("is-invalid", !correct);

  if (correct) {
    result.innerHTML = `<span class="badge bg-success py-1 px-2"><i class="fa-solid fa-check me-1"></i>Đúng</span>`;
  } else {
    result.innerHTML = `
      <div class="d-flex flex-column align-items-center">
        <span class="badge bg-danger py-1 px-2 mb-1"><i class="fa-solid fa-xmark me-1"></i>Sai</span>
        <small class="text-success fw-bold" style="font-size:.75rem;">ĐA: ${escapeHtml(correctVal)}</small>
      </div>`;
  }

  recalculateScore();
}

function checkAllAnswers() {
  if (!practiceWords.length) return;
  practiceWords.forEach((_, index) => checkSingleAnswer(index));
  
  const correctCount = practiceWords.filter((_, index) =>
    document.getElementById(`input_${index}`)?.classList.contains("is-valid")
  ).length;

  showToast(`Bạn trả lời đúng ${correctCount}/${practiceWords.length} câu!`, "primary");
}

function recalculateScore() {
  const total = practiceWords.length;
  let correct = 0, wrong = 0;

  practiceWords.forEach((_, index) => {
    const input = document.getElementById(`input_${index}`);
    if (!input || !input.value.trim()) return;
    if (input.classList.contains("is-valid")) correct++;
    else if (input.classList.contains("is-invalid")) wrong++;
  });

  const pending = total - correct - wrong;
  const percent = total ? Math.round(correct / total * 100) : 0;
  updateScoreboard(correct, wrong, pending, percent);
}

function updateScoreboard(c, w, p, pct) {
  document.getElementById("scoreCorrect").innerText = c;
  document.getElementById("scoreWrong").innerText = w;
  document.getElementById("scorePending").innerText = p;
  document.getElementById("scorePercent").innerText = pct + "%";
}

function resetPractice() {
  practiceWords.forEach((_, index) => {
    const input = document.getElementById(`input_${index}`);
    const result = document.getElementById(`result_${index}`);
    const speechText = document.getElementById(`speechText_${index}`);
    const speechMatch = document.getElementById(`speechMatch_${index}`);

    if (input) {
      input.value = "";
      input.classList.remove("is-valid", "is-invalid");
    }
    if (result) result.innerHTML = `<span class="badge bg-light text-dark border">Chưa làm</span>`;
    if (speechText) speechText.textContent = "Chưa ghi âm";
    if (speechMatch) speechMatch.innerHTML = "";
  });
  updateScoreboard(0, 0, practiceWords.length, 0);
  document.getElementById("btnSubmitPractice").disabled = practiceWords.length === 0;
}
