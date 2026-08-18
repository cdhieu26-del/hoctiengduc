/* =========================================================
   HỌC TIẾNG ĐỨC A1-A2 - FRONTEND CHO GITHUB PAGES
   =========================================================
   CHỈ CẦN SỬA API_URL BÊN DƯỚI thành URL Web App Apps Script.
   ========================================================= */

const API_URL = "https://script.google.com/macros/s/AKfycbzQ-W1MGvMWgGyK61-Gw_p9Q1iWGqvK5k6EXsYKNE6wpgqwMEQn4AUbJmhWPMfvjvkB/exec";

let currentSheet = "tiengDucA1";
let allData = [];
let filteredData = [];
let currentPage = 1;
const rowsPerPage = 50;

let practiceWords = [];
let practiceRawData = [];

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
  // Không đặt Content-Type để tránh CORS preflight khi gọi từ GitHub Pages.
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

/* ---------- Vocabulary ---------- */

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

  document.querySelectorAll(".custom-tabs .nav-link").forEach(el => el.classList.remove("active"));

  loadData();
}

async function loadData() {
  setLoading(true);
  const tbody = document.getElementById("tableBody");
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="text-center py-5">
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
          <td colspan="11" class="text-center text-danger py-5">
            <i class="fa-solid fa-triangle-exclamation fa-2x mb-2"></i>
            <div>Không tải được dữ liệu.</div>
            <small>${escapeHtml(error.message)}</small>
          </td>
        </tr>`;
    }
    showToast("Không thể kết nối Google Sheets. Kiểm tra API_URL và quyền Web App.", "danger");
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
    select.insertAdjacentHTML(
      "beforeend",
      `<option value="${escapeHtml(topic)}">${escapeHtml(topic)}</option>`
    );
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
    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="text-center text-muted py-5">
          Không tìm thấy dữ liệu.
        </td>
      </tr>`;
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
                    onclick="speakGerman(this)" title="Nghe đọc">
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
      <td class="text-center text-nowrap">
        <button class="btn btn-sm btn-outline-primary me-1"
                onclick="openModal('edit', ${Number(item.rowIndex)})" title="Sửa">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger"
                onclick="openDeleteModal(${Number(item.rowIndex)})" title="Xóa">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
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
  buttons.push(`
    <li class="page-item ${page === 1 ? "disabled" : ""}">
      <button class="page-link" onclick="goToPage(${page - 1})">‹</button>
    </li>`);

  const pages = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== "...") pages.push("...");
  }

  pages.forEach(p => {
    if (p === "...") {
      buttons.push(`<li class="page-item ellipsis"><span class="page-link">…</span></li>`);
    } else {
      buttons.push(`
        <li class="page-item ${p === page ? "active" : ""}">
          <button class="page-link" onclick="goToPage(${p})">${p}</button>
        </li>`);
    }
  });

  buttons.push(`
    <li class="page-item ${page === totalPages ? "disabled" : ""}">
      <button class="page-link" onclick="goToPage(${page + 1})">›</button>
    </li>`);

  pagination.innerHTML = buttons.join("");
}

function goToPage(page) {
  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  displayData();
  document.querySelector(".table-wrapper")?.scrollTo({ top: 0, behavior: "smooth" });
}

function speakGerman(button) {
  const text = decodeURIComponent(button.dataset.text || "");
  if (!text || !("speechSynthesis" in window)) {
    showToast("Trình duyệt không hỗ trợ đọc văn bản.", "warning");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
}

/* ---------- Add / Edit / Delete ---------- */

function getFormData() {
  return {
    chuDe: document.getElementById("chuDe").value,
    tiengDuc: document.getElementById("tiengDuc").value,
    ipa: document.getElementById("ipa").value,
    tuLoai: document.getElementById("tuLoai").value,
    maoTu: document.getElementById("maoTu").value,
    soNhieu: document.getElementById("soNhieu").value,
    nghiaTV: document.getElementById("nghiaTV").value,
    viDu: document.getElementById("viDu").value,
    dichViDu: document.getElementById("dichViDu").value
  };
}

function fillForm(item) {
  document.getElementById("chuDe").value = item.chuDe || "";
  document.getElementById("tiengDuc").value = item.tiengDuc || "";
  document.getElementById("ipa").value = item.ipa || "";
  document.getElementById("tuLoai").value = item.tuLoai || "";
  document.getElementById("maoTu").value = item.maoTu || "";
  document.getElementById("soNhieu").value = item.soNhieu || "";
  document.getElementById("nghiaTV").value = item.nghiaTV || "";
  document.getElementById("viDu").value = item.viDu || "";
  document.getElementById("dichViDu").value = item.dichViDu || "";
}

function openModal(mode, rowIndex = null) {
  const modalEl = document.getElementById("dataModal");
  const form = document.getElementById("dataForm");
  if (!modalEl || !form) return;

  form.reset();
  document.getElementById("rowIndex").value = "";

  if (mode === "edit") {
    const item = allData.find(x => Number(x.rowIndex) === Number(rowIndex));
    if (!item) {
      showToast("Không tìm thấy dòng dữ liệu.", "danger");
      return;
    }
    document.getElementById("modalTitle").textContent = "Sửa từ vựng";
    document.getElementById("rowIndex").value = item.rowIndex;
    fillForm(item);
  } else {
    document.getElementById("modalTitle").textContent = "Thêm Từ Mới";
  }

  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

async function saveData() {
  const form = document.getElementById("dataForm");
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const rowIndex = document.getElementById("rowIndex").value;
  const action = rowIndex ? "update" : "add";

  try {
    setLoading(true);
    await apiPost({
      action,
      sheetName: currentSheet,
      rowIndex: rowIndex ? Number(rowIndex) : null,
      data: getFormData()
    });

    bootstrap.Modal.getOrCreateInstance(document.getElementById("dataModal")).hide();
    showToast(action === "add" ? "Đã thêm dữ liệu." : "Đã cập nhật dữ liệu.", "success");
    await loadData();
  } catch (error) {
    console.error(error);
    showToast("Không lưu được: " + error.message, "danger");
  } finally {
    setLoading(false);
  }
}

function openDeleteModal(rowIndex) {
  document.getElementById("deleteRowIndex").value = rowIndex;
  bootstrap.Modal.getOrCreateInstance(document.getElementById("deleteModal")).show();
}

async function confirmDelete() {
  const rowIndex = Number(document.getElementById("deleteRowIndex").value);
  if (!rowIndex) return;

  try {
    setLoading(true);
    await apiPost({
      action: "delete",
      sheetName: currentSheet,
      rowIndex,
      data: null
    });

    bootstrap.Modal.getOrCreateInstance(document.getElementById("deleteModal")).hide();
    showToast("Đã xóa dữ liệu.", "success");
    await loadData();
  } catch (error) {
    console.error(error);
    showToast("Không xóa được: " + error.message, "danger");
  } finally {
    setLoading(false);
  }
}

/* Compatibility names */
function bieuMauThemMoi(obj) { return apiPost({action:"add", sheetName:currentSheet, rowIndex:null, data:obj}); }
function bieuMauCapNhat(rowIndex, obj) { return apiPost({action:"update", sheetName:currentSheet, rowIndex, data:obj}); }
function bieuMauXoa(rowIndex) { return apiPost({action:"delete", sheetName:currentSheet, rowIndex, data:null}); }

/* ---------- Practice: German -> Vietnamese ---------- */

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
      select.insertAdjacentHTML(
        "beforeend",
        `<option value="${escapeHtml(topic)}">${escapeHtml(topic)}</option>`
      );
    });
  } catch (error) {
    console.error(error);
    showToast("Không tải được dữ liệu luyện tập: " + error.message, "danger");
  }
}

async function startPractice() {
  const level = document.getElementById("practiceLevel").value;
  const topic = document.getElementById("practiceTopic").value;
  const tbody = document.getElementById("practiceTableBody");

  tbody.innerHTML = `
    <tr><td colspan="5" class="text-center py-5">
      <div class="spinner-border text-primary-custom"></div>
      <div class="mt-2 text-muted">Đang khởi tạo bài tập...</div>
    </td></tr>`;

  try {
    const data = await getPracticeData(level);
    practiceRawData = data;

    let filtered = topic ? data.filter(item => item.chuDe === topic) : data;

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Không tìm thấy dữ liệu.</td></tr>`;
      practiceWords = [];
      updateScoreboard(0, 0, 0, 0);
      return;
    }

    practiceWords = [...filtered].sort(() => Math.random() - 0.5).slice(0, 50);
    renderPracticeTable();
    document.getElementById("btnSubmitPractice").disabled = false;
    updateScoreboard(0, 0, practiceWords.length, 0);
    showToast(`Đã tạo ${practiceWords.length} từ luyện tập.`, "success");
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Lỗi tải dữ liệu: ${escapeHtml(error.message)}</td></tr>`;
  }
}

function renderPracticeTable() {
  const tbody = document.getElementById("practiceTableBody");
  tbody.innerHTML = practiceWords.map((item, index) => `
    <tr id="practiceRow_${index}">
      <td class="text-center fw-bold">${index + 1}</td>
      <td><span class="badge bg-secondary">${escapeHtml(item.chuDe)}</span></td>
      <td class="fw-bold text-primary-custom">
        <div class="d-flex align-items-center justify-content-between gap-1">
          <span>
            ${item.maoTu ? `<small class="text-muted fw-normal">(${escapeHtml(item.maoTu)})</small> ` : ""}
            ${escapeHtml(item.tiengDuc)}
          </span>
          <button class="btn btn-sm btn-speak p-0 border-0"
                  data-text="${encodeURIComponent(item.tiengDuc || "")}"
                  onclick="speakGerman(this)" title="Nghe đọc">
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
      <td class="text-center practice-result" id="result_${index}">
        <span class="badge bg-light text-dark border">Chưa làm</span>
      </td>
    </tr>
  `).join("");
}

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
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[\/(),;.\-]/g, " ")
    .replace(/\s+/g, " ");
}

function isAnswerCorrect(userAns, targetAns) {
  if (!userAns || !targetAns) return false;

  const user = normalizeText(userAns);
  const target = normalizeText(targetAns);

  if (user === target) return true;

  const meanings = String(targetAns)
    .split(/[,;\/\(\)]+/)
    .map(x => normalizeText(x))
    .filter(Boolean);

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

  showToast(`Bạn đã trả lời đúng ${correctCount}/${practiceWords.length} câu!`,
    correctCount === practiceWords.length ? "success" : "primary");
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
    if (input) {
      input.value = "";
      input.classList.remove("is-valid", "is-invalid");
    }
    if (result) result.innerHTML = `<span class="badge bg-light text-dark border">Chưa làm</span>`;
  });
  updateScoreboard(0, 0, practiceWords.length, 0);
  document.getElementById("btnSubmitPractice").disabled = practiceWords.length === 0;
}
