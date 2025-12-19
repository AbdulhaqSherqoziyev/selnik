const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const companyNameEl = document.getElementById("companyName");
const logoInputEl = document.getElementById("logoInput");
const logoPreviewEl = document.getElementById("logoPreview");
const manualProductsEl = document.getElementById("manualProducts");
const excelInputEl = document.getElementById("excelInput");
const previewManualEl = document.getElementById("previewManual");
const previewExcelEl = document.getElementById("previewExcel");
const themeValueEl = document.getElementById("themeValue");
const sizeValueEl = document.getElementById("sizeValue");

let logoImg = null;
let logoObjectUrl = null;
let manualImgs = [];
let excelImgs = [];
let excelData = [];
let currentTheme = "light";

const formatUzs = value => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return String(Math.round(n)) + " so'm";
};

const parsePrice = raw => {
  if (raw === null || raw === undefined) return NaN;
  const s = String(raw).replace(/\s+/g, "").replace(/,/g, ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

const safeFileName = s => String(s || "sennik").replace(/[\\/:*?"<>|]+/g, "-").trim();

function setButtonsEnabled() {
  const manualBtn = document.querySelector("button.primary[onclick=\"downloadManualZip()\"]");
  const excelBtn = document.querySelector("button.primary[onclick=\"downloadExcelZip()\"]");
  const allBtn = document.querySelector("button.primary[onclick=\"downloadAllZip()\"]");
  const pdfBtn = document.querySelector("button.primary[onclick=\"downloadPdfAll()\"]");
  if (manualBtn) manualBtn.disabled = manualImgs.length === 0;
  if (excelBtn) excelBtn.disabled = excelImgs.length === 0;
  const allCount = manualImgs.length + excelImgs.length;
  if (allBtn) allBtn.disabled = allCount === 0;
  if (pdfBtn) pdfBtn.disabled = allCount === 0;
}

function getSelectedTheme() {
  const v = themeValueEl ? themeValueEl.value : "light";
  return v === "dark" ? "dark" : "light";
}

function initThemeToggle() {
  const root = document.querySelector(".theme-toggle");
  if (!root) return;
  const buttons = Array.from(root.querySelectorAll(".theme-btn"));
  const apply = value => {
    buttons.forEach(b => b.classList.toggle("is-active", b.dataset.theme === value));
    themeValueEl.value = value;
    const hasPreview = (manualImgs && manualImgs.length) || (excelImgs && excelImgs.length);
    if (hasPreview) generateAll();
  };
  buttons.forEach(b => {
    b.addEventListener("click", () => apply(b.dataset.theme));
  });
  apply(getSelectedTheme());
}

function getSelectedSize() {
  const v = (sizeValueEl?.value || "lg").trim();
  return v === "sm" || v === "md" || v === "lg" ? v : "lg";
}

function getSizeScale(size) {
  if (size === "md") return 0.6;
  if (size === "sm") return 0.4;
  return 1;
}

function initSizeToggle() {
  const root = document.querySelector(".size-toggle");
  if (!root || !sizeValueEl) return;
  const buttons = Array.from(root.querySelectorAll(".size-btn"));
  const examplesRoot = document.querySelector(".size-examples");
  const examples = examplesRoot ? Array.from(examplesRoot.querySelectorAll(".size-example")) : [];
  const apply = value => {
    buttons.forEach(b => b.classList.toggle("is-active", b.dataset.size === value));
    examples.forEach(e => e.classList.toggle("is-active", e.dataset.size === value));
    sizeValueEl.value = value;
    const hasPreview = (manualImgs && manualImgs.length) || (excelImgs && excelImgs.length);
    if (hasPreview) generateAll();
  };
  buttons.forEach(b => {
    b.addEventListener("click", () => apply(b.dataset.size));
  });
  apply(getSelectedSize());
}

function showInlineError(container, message) {
  let el = container.querySelector(".inline-error");
  if (!message) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("div");
    el.className = "inline-error";
    container.prepend(el);
  }
  el.textContent = message;
}

function getPlans() {
  const monthsEls = Array.from(document.querySelectorAll(".months"));
  const percentEls = Array.from(document.querySelectorAll(".percent"));
  const plans = [];
  for (let i = 0; i < Math.min(monthsEls.length, percentEls.length); i++) {
    const months = Number(monthsEls[i].value);
    const percent = Number(percentEls[i].value);
    if (!Number.isFinite(months) || months <= 0) continue;
    if (!Number.isFinite(percent) || percent < 0) continue;
    plans.push({ months, percent });
  }
  plans.sort((a, b) => a.months - b.months);
  return plans;
}

function calcMonthly(price, months, percent) {
  const total = price * (1 + percent / 100);
  return Math.ceil(total / months);
}

function wrapText(text, x, y, maxWidth, lineHeight, maxLines) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
      continue;
    }
    if (line) lines.push(line);
    line = w;
    if (lines.length === maxLines - 1) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, y + i * lineHeight);
  return lines.length;
}

function drawFittedWrappedText(text, x, y, maxWidth, baseFont, minFont, maxLines, fillStyle) {
  const prevFont = ctx.font;
  const prevAlign = ctx.textAlign;
  const prevFill = ctx.fillStyle;
  ctx.textAlign = "left";
  ctx.fillStyle = fillStyle;

  const raw = String(text || "").trim();
  const words = raw ? raw.split(/\s+/).filter(Boolean) : [];

  const buildLines = (fontSize, withEllipsis) => {
    ctx.font = `700 ${fontSize}px Arial`;
    const lines = [];
    let line = "";

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width <= maxWidth) {
        line = test;
        continue;
      }

      if (line) lines.push(line);
      line = w;

      if (lines.length === maxLines - 1) {
        if (withEllipsis) {
          const remaining = words.slice(i + 1).length > 0;
          if (remaining || ctx.measureText(line).width > maxWidth) {
            let last = line;
            const dots = "…";
            while (last && ctx.measureText(last + dots).width > maxWidth) {
              last = last.slice(0, -1);
            }
            lines.push((last || "").trimEnd() + dots);
            return lines;
          }
        }
        lines.push(line);
        return lines;
      }
    }

    if (line) lines.push(line);
    return lines;
  };

  let size = baseFont;
  let lines = [];
  while (size >= minFont) {
    lines = buildLines(size, false);
    if (words.length === 0) break;
    if (lines.length <= maxLines) {
      const combinedWords = lines.join(" ").split(/\s+/).filter(Boolean).length;
      if (combinedWords >= words.length) break;
    }
    size -= 2;
  }

  if (words.length && (lines.join(" ").split(/\s+/).filter(Boolean).length < words.length || lines.length > maxLines)) {
    size = Math.max(minFont, size);
    lines = buildLines(size, true);
  }

  const lineHeight = Math.round(size * 1.1);
  for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
    ctx.font = `700 ${size}px Arial`;
    ctx.fillText(lines[i], x, y + i * lineHeight);
  }

  ctx.font = prevFont;
  ctx.textAlign = prevAlign;
  ctx.fillStyle = prevFill;

  return { lines: Math.min(lines.length, maxLines), lineHeight };
}

function roundRect(x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return String(Math.round(n));
}

function drawRightFittedText(text, xRight, y, maxWidth, baseFont, minFont, fillStyle) {
  const prevFont = ctx.font;
  const prevAlign = ctx.textAlign;
  const prevFill = ctx.fillStyle;
  ctx.textAlign = "right";
  ctx.fillStyle = fillStyle;

  let size = baseFont;
  while (size >= minFont) {
    ctx.font = `900 ${size}px Arial`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  ctx.fillText(text, xRight, y);

  ctx.font = prevFont;
  ctx.textAlign = prevAlign;
  ctx.fillStyle = prevFill;
}

function drawCenteredFittedText(text, xCenter, y, maxWidth, baseFont, minFont, fillStyle) {
  const prevFont = ctx.font;
  const prevAlign = ctx.textAlign;
  const prevFill = ctx.fillStyle;
  ctx.textAlign = "center";
  ctx.fillStyle = fillStyle;

  let size = baseFont;
  while (size >= minFont) {
    ctx.font = `900 ${size}px Arial`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  ctx.fillText(text, xCenter, y);

  ctx.font = prevFont;
  ctx.textAlign = prevAlign;
  ctx.fillStyle = prevFill;
}

/* LOGO */
logoInputEl.onchange = e => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl);
  logoObjectUrl = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    logoImg = img;
    logoPreviewEl.src = logoObjectUrl;
  };
  img.onerror = () => {
    logoImg = null;
    logoPreviewEl.src = "";
  };
  img.src = logoObjectUrl;
};
function removeLogo() {
  logoImg = null;
  if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl);
  logoObjectUrl = null;
  logoPreviewEl.src = "";
  logoInputEl.value = "";
}

/* MANUAL */
function addManual() {
  const div = document.createElement("div");
  div.className = "manual-row";
  div.innerHTML = `<input class="manual-name" placeholder="Nomi"><input class="manual-price" placeholder="Narxi" inputmode="decimal"><button type="button" class="danger" aria-label="O'chirish">✕</button>`;
  div.querySelector("button").onclick = () => {
    div.remove();
  };
  manualProductsEl.appendChild(div);
}
addManual();

/* EXCEL */
excelInputEl.onchange = e => {
  const reader = new FileReader();
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  reader.onload = evt => {
    try {
      const wb = XLSX.read(evt.target.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const sheet = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
      const rows = (sheet || []).filter(r => Array.isArray(r) && (r[0] !== undefined || r[1] !== undefined));

      let start = 0;
      if (rows.length) {
        const h0 = String(rows[0][0] ?? "").toLowerCase();
        const h1 = String(rows[0][1] ?? "").toLowerCase();
        const looksHeader =
          h0.includes("nom") ||
          h0.includes("product") ||
          h1.includes("narx") ||
          h1.includes("price");
        if (looksHeader) start = 1;
      }

      excelData = rows
        .slice(start)
        .map(r => ({ name: String(r[0] ?? "").trim(), price: parsePrice(r[1]) }))
        .filter(x => x.name && Number.isFinite(x.price) && x.price > 0);

      const card = excelInputEl.closest(".card") || document.body;
      showInlineError(card, excelData.length ? "" : "Excel faylda to'g'ri ma'lumot topilmadi (2 ustun: nomi va narxi).");
    } catch (err) {
      excelData = [];
      const card = excelInputEl.closest(".card") || document.body;
      showInlineError(card, "Excel faylni o'qib bo'lmadi. Formatni tekshiring (.xlsx). ");
    }
  };
  reader.readAsArrayBuffer(file);
};

/* DRAW */
function drawSennik(name, price, theme = "light", size = "lg") {
  const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
  const baseW = 900;
  const baseH = 1200;
  const scale = getSizeScale(size);
  const w = baseW;
  const h = baseH;
  canvas.width = Math.round(baseW * scale * dpr);
  canvas.height = Math.round(baseH * scale * dpr);
  canvas.style.width = Math.round(baseW * scale) + "px";
  canvas.style.height = Math.round(baseH * scale) + "px";
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);

  const plans = getPlans();

  const isDark = theme === "dark";
  const outerBg = isDark ? "#000000" : "#f3f4f6";
  const accent = isDark ? "#fbbf24" : "#4f46e5";
  const textPrimary = isDark ? "#fbbf24" : "#111827";
  const textSecondary = isDark ? "#f59e0b" : "#0f172a";

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = outerBg;
  ctx.fillRect(0, 0, w, h);

  ctx.shadowColor = isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.15)";
  ctx.shadowBlur = isDark ? 18 : 25;
  ctx.fillStyle = isDark ? "#0b0b0f" : "#ffffff";
  ctx.fillRect(20, 20, 860, 1160);
  ctx.shadowBlur = 0;

  ctx.fillStyle = textPrimary;
  ctx.font = "900 42px Arial";

  const headerY = 112;
  const leftX = 60;

  let headerX = leftX;
  let logoBottomY = 60;
  if (logoImg) {
    const maxW = 340;
    const maxH = 170;
    const r = Math.min(maxW / logoImg.width, maxH / logoImg.height);
    const dw = Math.round(logoImg.width * r);
    const dh = Math.round(logoImg.height * r);
    const lx = leftX;
    const ly = 68;
    if (isDark) {
      const pad = 14;
      const bgX = lx - pad;
      const bgY = ly - pad;
      const bgW = dw + pad * 2;
      const bgH = dh + pad * 2;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.65)";
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#f8fafc";
      roundRect(bgX, bgY, bgW, bgH, 14);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(251,191,36,0.55)";
      ctx.lineWidth = 3;
      roundRect(bgX, bgY, bgW, bgH, 14);
      ctx.stroke();
      ctx.restore();
    }
    ctx.drawImage(logoImg, lx, ly, dw, dh);
    headerX = leftX + dw + 18;
    logoBottomY = ly + dh;
  }

  const company = (companyNameEl.value || "").trim();
  if (company) {
    const maxW = 760;
    drawCenteredFittedText(company, w / 2, headerY, maxW, 62, 34, textPrimary);
  }

  const dividerY = Math.max(210, logoBottomY + 18);
  ctx.fillStyle = accent;
  ctx.fillRect(60, dividerY, 780, 6);

  ctx.fillStyle = textPrimary;
  const titleBlock = drawFittedWrappedText(name, 60, dividerY + 104, 780, 66, 36, 3, textPrimary);

  ctx.font = "700 58px Arial";
  ctx.fillStyle = textSecondary;
  const priceY = dividerY + 104 + titleBlock.lines * titleBlock.lineHeight + 26;
  ctx.fillText(formatUzs(price), 60, priceY);

  const tableTop = priceY + 135;
  const tableX = 60;
  const tableW = 780;
  const headerH = 78;
  const rowH = 98;
  const col1X = 90;
  const col2X = 470;
  const rightX = tableX + tableW - 50;

  ctx.fillStyle = isDark ? "#111827" : "#eef2ff";
  ctx.fillRect(tableX, tableTop - headerH, tableW, headerH);
  ctx.fillStyle = textPrimary;
  ctx.font = "900 44px Arial";
  ctx.fillText("Muddat (oy)", col1X, tableTop - 26);
  ctx.save();
  ctx.textAlign = "right";
  ctx.fillText("Oylik to'lov", rightX, tableTop - 26);
  ctx.restore();

  ctx.font = "900 54px Arial";
  let y = tableTop;
  for (let i = 0; i < plans.length; i++) {
    const pl = plans[i];
    const monthly = calcMonthly(price, pl.months, pl.percent);

    if (i % 2 === 0) {
      ctx.fillStyle = isDark ? "#0f172a" : "#f8fafc";
      ctx.fillRect(tableX, y, tableW, rowH);
    }

    ctx.strokeStyle = isDark ? "#1f2937" : "#e5e7eb";
    ctx.beginPath();
    ctx.moveTo(tableX, y + rowH);
    ctx.lineTo(tableX + tableW, y + rowH);
    ctx.stroke();

    ctx.fillStyle = textPrimary;
    ctx.fillText(pl.months + " oy", col1X, y + 62);

    const amount = formatNumber(monthly);
    const amountText = amount;
    const suffix = "oy/so'mdan";

    const maxW = rightX - col2X;
    drawRightFittedText(amountText, rightX, y + 62, maxW, 52, 34, textSecondary);
    ctx.save();
    ctx.textAlign = "right";
    ctx.fillStyle = textPrimary;
    ctx.font = "800 24px Arial";
    ctx.fillText(suffix, rightX, y + 92);
    ctx.restore();

    y += rowH;
  }

  ctx.fillStyle = isDark ? "#fbbf24" : "#6b7280";
  ctx.font = "500 16px Arial";

  return canvas.toDataURL("image/png");
}

/* GENERATE */
function generateAll() {
  currentTheme = getSelectedTheme();
  const currentSize = getSelectedSize();
  previewManualEl.innerHTML = "";
  previewExcelEl.innerHTML = "";
  manualImgs = [];
  excelImgs = [];

  const plans = getPlans();
  const plansCard = document.querySelector(".plans")?.closest(".card") || document.body;
  showInlineError(plansCard, plans.length ? "" : "Nasiya shartlarini to'g'ri kiriting (oy > 0, foiz >= 0). ");
  if (!plans.length) {
    setButtonsEnabled();
    return;
  }

  const manualRows = Array.from(document.querySelectorAll("#manualProducts .manual-row"));
  for (const row of manualRows) {
    const name = (row.querySelector(".manual-name")?.value || "").trim();
    const price = parsePrice(row.querySelector(".manual-price")?.value);
    if (!name && !row.querySelector(".manual-price")?.value) continue;
    const isValid = name && Number.isFinite(price) && price > 0;
    row.style.outline = isValid ? "" : "2px solid #fecaca";
    if (!isValid) continue;

    const img = drawSennik(name, price, currentTheme, currentSize);
    manualImgs.push({ name, price, img, theme: currentTheme, size: currentSize });
    previewManualEl.appendChild(makePreviewCard(name, img));
  }

  for (const r of excelData) {
    const img = drawSennik(r.name, r.price, currentTheme, currentSize);
    excelImgs.push({ name: r.name, price: r.price, img, theme: currentTheme, size: currentSize });
    previewExcelEl.appendChild(makePreviewCard(r.name, img));
  }

  setButtonsEnabled();
}

function makePreviewCard(name, img) {
  const card = document.createElement("div");
  card.className = "preview-card";
  const safe = safeFileName(name) || "sennik";
  card.innerHTML = `
    <img alt="${safe}" src="${img}">
    <div class="preview-actions">
      <a class="secondary" download="${safe}.png" href="${img}">PNG yuklab olish</a>
    </div>
  `;
  return card;
}

/* ZIP */
function buildUniqueZipNames(list) {
  const used = new Map();
  return list.map((item, idx) => {
    const base = safeFileName(item.name) || `sennik_${idx + 1}`;
    const c = (used.get(base) || 0) + 1;
    used.set(base, c);
    const unique = c === 1 ? base : `${base}_${c}`;
    return { ...item, __zipName: unique };
  });
}

async function makeZip(list, name) {
  const manualBtn = document.querySelector("button.primary[onclick=\"downloadManualZip()\"]");
  const excelBtn = document.querySelector("button.primary[onclick=\"downloadExcelZip()\"]");
  const allBtn = document.querySelector("button.primary[onclick=\"downloadAllZip()\"]");
  const pdfBtn = document.querySelector("button.primary[onclick=\"downloadPdfAll()\"]");
  if (manualBtn) manualBtn.disabled = true;
  if (excelBtn) excelBtn.disabled = true;
  if (allBtn) allBtn.disabled = true;
  if (pdfBtn) pdfBtn.disabled = true;
  const zip = new JSZip();
  const items = buildUniqueZipNames(list);
  items.forEach((item, i) => {
    const dataUrl = item.img || item;
    const base64 = String(dataUrl).split(",")[1];
    const fnameBase = item.__zipName || `sennik_${i + 1}`;
    zip.file(`${fnameBase}.png`, base64, { base64: true });
  });
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setButtonsEnabled();
}
function downloadManualZip() { makeZip(manualImgs, "manual_senniklar.zip"); }
function downloadExcelZip() { makeZip(excelImgs, "excel_senniklar.zip"); }

function downloadAllZip() {
  const all = [...manualImgs, ...excelImgs];
  makeZip(all, "barcha_senniklar.zip");
}

async function downloadPdfAll() {
  const allBtn = document.querySelector("button.primary[onclick=\"downloadAllZip()\"]");
  const pdfBtn = document.querySelector("button.primary[onclick=\"downloadPdfAll()\"]");
  if (allBtn) allBtn.disabled = true;
  if (pdfBtn) pdfBtn.disabled = true;

  const list = [...manualImgs, ...excelImgs];
  if (!list.length) {
    setButtonsEnabled();
    return;
  }

  const jspdf = window.jspdf;
  if (!jspdf || !jspdf.jsPDF) {
    alert("PDF kutubxonasi yuklanmadi (jsPDF).");
    setButtonsEnabled();
    return;
  }

  const doc = new jspdf.jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const margin = 1;
  const pdfSize = getSelectedSize();
  const cols = pdfSize === "sm" ? 5 : pdfSize === "md" ? 4 : 3;
  const rows = pdfSize === "sm" ? 5 : pdfSize === "md" ? 4 : 3;
  const cellW = (pageW - margin * 2) / cols;
  const cellH = (pageH - margin * 2) / rows;
  const pad = 0.25;

  const perPage = cols * rows;
  for (let i = 0; i < list.length; i++) {
    if (i > 0 && i % perPage === 0) doc.addPage();

    const pos = i % perPage;
    const c = pos % cols;
    const r = Math.floor(pos / cols);
    const x = margin + c * cellW;
    const y = margin + r * cellH;

    const item = list[i];
    const fitW = cellW - pad * 2;
    const fitH = cellH - pad * 2;

    if (item.theme === "dark") {
      doc.setFillColor(0, 0, 0);
      doc.rect(x, y, cellW, cellH, "F");
    }

    const img = item.img;
    const aspect = 900 / 1200;
    let drawW = fitW;
    let drawH = drawW / aspect;
    if (drawH > fitH) {
      drawH = fitH;
      drawW = drawH * aspect;
    }
    const dx = x + (cellW - drawW) / 2;
    const dy = y + (cellH - drawH) / 2;
    doc.addImage(img, "PNG", dx, dy, drawW, drawH);
  }

  doc.save("barcha_senniklar.pdf");
  setButtonsEnabled();
}

initThemeToggle();
initSizeToggle();
setButtonsEnabled();
