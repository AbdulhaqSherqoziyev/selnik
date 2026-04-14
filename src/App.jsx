import { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

const BASE_W = 900;
const BASE_H = 1200;

const defaultLayout = {
  shopName: { x: 450, y: 112, maxW: 760, font: 62 },
  logo: { x: 60, y: 68, maxW: 340, maxH: 170 },
  product: { x: 60, y: 314, maxW: 780, font: 66, color: '#111827', fontFamily: 'Inter', weight: 800 },
  price: { x: 60, y: 560, font: 58, color: '#0f172a', dividerY: 210, fontFamily: 'Inter', weight: 800 },
  table: { x: 60, y: 695, w: 780, headerH: 78, rowH: 98 },
  tableMonths: { x: 90, w: 300, font: 54, color: '#111827', fontFamily: 'Inter', weight: 900 },
  tablePrice: { x: 520, w: 320, font: 52, color: '#0f172a', fontFamily: 'Inter', weight: 900 },
  tableSuffix: { font: 24, color: '#111827', fontFamily: 'Inter', weight: 800 }
};

const fieldTitles = {
  shopName: "Do'kon nomi",
  logo: 'Logo',
  product: 'Mahsulot nomi',
  price: 'Narx',
  table: 'Jadval (balandlik)',
  tableMonths: 'Oylar ustuni',
  tablePrice: 'Narx ustuni'
};

const createId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function Icon({ name, size = 18, stroke = 1.9 }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: stroke,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true
  };

  if (name === 'upload') {
    return (
      <svg {...props}>
        <path d="M12 16V5" />
        <path d="m7 10 5-5 5 5" />
        <path d="M20 16.5a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 4 16.5" />
      </svg>
    );
  }
  if (name === 'excel') {
    return (
      <svg {...props}>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
        <path d="m9 11 4 6" />
        <path d="m13 11-4 6" />
      </svg>
    );
  }
  if (name === 'plus') {
    return (
      <svg {...props}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    );
  }
  if (name === 'trash') {
    return (
      <svg {...props}>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="m19 6-1 14H6L5 6" />
      </svg>
    );
  }
  if (name === 'check') {
    return (
      <svg {...props}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }
  if (name === 'zip') {
    return (
      <svg {...props}>
        <path d="M8 3h8l5 5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
        <path d="M13 3v5h5" />
        <path d="M10 10h4" />
        <path d="M10 14h4" />
        <path d="M10 18h4" />
      </svg>
    );
  }
  if (name === 'pdf') {
    return (
      <svg {...props}>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
        <path d="M8.5 15h2a1.5 1.5 0 0 0 0-3h-2V18" />
        <path d="M13 18v-6h1.5a2 2 0 0 1 0 4H13" />
      </svg>
    );
  }
  if (name === 'sparkles') {
    return (
      <svg {...props}>
        <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" />
        <path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

function truncateToDecimals(n, decimals) {
  const f = Math.pow(10, decimals);
  const v = n * f;
  const t = v < 0 ? Math.ceil(v) : Math.floor(v);
  return t / f;
}

function drawLeftFittedText(ctx, text, xLeft, y, maxWidth, baseFont, minFont, fillStyle, weight = '900', family = 'Arial') {
  const prevFont = ctx.font;
  const prevAlign = ctx.textAlign;
  const prevBaseline = ctx.textBaseline;
  const prevFill = ctx.fillStyle;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fillStyle;

  let size = baseFont;
  while (size >= minFont) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  ctx.fillText(text, xLeft, y);

  ctx.font = prevFont;
  ctx.textAlign = prevAlign;
  ctx.textBaseline = prevBaseline;
  ctx.fillStyle = prevFill;
}

function formatSpacedNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  const t = truncateToDecimals(n, 1);
  const s = Math.abs(t).toFixed(1);
  const parts = s.split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const fracPart = parts[1] || '0';
  const sign = t < 0 ? '-' : '';
  if (fracPart === '0') return `${sign}${intPart}`;
  return `${sign}${intPart}.${fracPart}`;
}

const formatUzs = value => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return `${formatSpacedNumber(n)} so'm`;
};

const parsePrice = raw => {
  if (raw === null || raw === undefined) return Number.NaN;
  const s = String(raw).replace(/\s+/g, '').replace(/,/g, '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : Number.NaN;
};

const safeFileName = s => String(s || 'sennik').replace(/[\\/:*?"<>|]+/g, '-').trim();

const getSizeScale = size => (size === 'md' ? 0.6 : size === 'sm' ? 0.4 : 1);

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawRightFittedText(ctx, text, xRight, y, maxWidth, baseFont, minFont, fillStyle, weight = '900', family = 'Arial') {
  const prevFont = ctx.font;
  const prevAlign = ctx.textAlign;
  const prevBaseline = ctx.textBaseline;
  const prevFill = ctx.fillStyle;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fillStyle;

  let size = baseFont;
  while (size >= minFont) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  ctx.fillText(text, xRight, y);

  ctx.font = prevFont;
  ctx.textAlign = prevAlign;
  ctx.textBaseline = prevBaseline;
  ctx.fillStyle = prevFill;
}

function drawCenteredFittedText(ctx, text, xCenter, y, maxWidth, baseFont, minFont, fillStyle, weight = '700', family = 'Arial') {
  const prevFont = ctx.font;
  const prevAlign = ctx.textAlign;
  const prevFill = ctx.fillStyle;
  ctx.textAlign = 'center';
  ctx.fillStyle = fillStyle;

  let size = baseFont;
  while (size >= minFont) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  ctx.fillText(text, xCenter, y);

  ctx.font = prevFont;
  ctx.textAlign = prevAlign;
  ctx.fillStyle = prevFill;
}

function drawFittedWrappedText(ctx, text, x, y, maxWidth, baseFont, minFont, maxLines, fillStyle, weight = '700', family = 'Arial', containerH = null, vAlign = 'top') {
  const prevFont = ctx.font;
  const prevAlign = ctx.textAlign;
  const prevFill = ctx.fillStyle;
  ctx.textAlign = 'left';
  ctx.fillStyle = fillStyle;

  const raw = String(text || '').trim();
  const words = raw ? raw.split(/\s+/).filter(Boolean) : [];

  const buildLines = (fontSize, withEllipsis) => {
    ctx.font = `${weight} ${fontSize}px ${family}`;
    const lines = [];
    let line = '';

    for (let i = 0; i < words.length; i += 1) {
      const w = words[i];
      const test = line ? `${line} ${w}` : w;
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
            const dots = '…';
            while (last && ctx.measureText(last + dots).width > maxWidth) {
              last = last.slice(0, -1);
            }
            lines.push((last || '').trimEnd() + dots);
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
      const combinedWords = lines.join(' ').split(/\s+/).filter(Boolean).length;
      if (combinedWords >= words.length) break;
    }
    size -= 2;
  }

  if (words.length && (lines.join(' ').split(/\s+/).filter(Boolean).length < words.length || lines.length > maxLines)) {
    size = Math.max(minFont, size);
    lines = buildLines(size, true);
  }

  const lineHeight = Math.round(size * 1.1);
  const total = Math.min(lines.length, maxLines);
  const startYOffset = containerH != null && vAlign === 'middle' ? Math.round((containerH - total * lineHeight) / 2) : 0;
  for (let i = 0; i < total; i += 1) {
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.fillText(lines[i], x, y + startYOffset + i * lineHeight);
  }

  ctx.font = prevFont;
  ctx.textAlign = prevAlign;
  ctx.fillStyle = prevFill;

  return { lines: total, lineHeight };
}

function calcMonthly(price, months, percent) {
  const total = price * (1 + percent / 100);
  return total / months;
}

function loadImage(url) {
  return new Promise(resolve => {
    if (!url) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function drawSennik({ canvas, companyName, name, price, theme, size, plans, layout, rowsBoxes, logoImage, templateImage }) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
  const scale = getSizeScale(size);
  const w = BASE_W;
  const h = BASE_H;
  canvas.width = Math.round(BASE_W * scale * dpr);
  canvas.height = Math.round(BASE_H * scale * dpr);
  canvas.style.width = `${Math.round(BASE_W * scale)}px`;
  canvas.style.height = `${Math.round(BASE_H * scale)}px`;
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);

  const isDark = theme === 'dark';
  const outerBg = isDark ? '#000000' : '#f3f4f6';
  const accent = isDark ? '#fbbf24' : '#4f46e5';
  const textPrimary = isDark ? '#fbbf24' : '#111827';
  const textSecondary = isDark ? '#f59e0b' : '#0f172a';

  ctx.clearRect(0, 0, w, h);
  if (templateImage) {
    ctx.drawImage(templateImage, 0, 0, w, h);
  } else {
    ctx.fillStyle = outerBg;
    ctx.fillRect(0, 0, w, h);

    ctx.shadowColor = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = isDark ? 18 : 25;
    ctx.fillStyle = isDark ? '#0b0b0f' : '#ffffff';
    ctx.fillRect(20, 20, 860, 1160);
    ctx.shadowBlur = 0;
  }

  let logoBottomY = 60; // Logo drawing disabled by request

  // Company name drawing disabled by request

  const dividerY = Math.max(layout.price.dividerY, logoBottomY + 18);
  ctx.fillStyle = accent;
  ctx.fillRect(layout.product.x, dividerY, layout.product.maxW, 6);

  const prodLineH = Math.round((layout.product.font || 66) * 1.1);
  const prodBoxH = Math.max(40, Math.round(layout.product.boxH || prodLineH * 3));
  const productMaxLines = Math.max(1, Math.floor(prodBoxH / prodLineH));
  const prodTopY = layout.product.y - Math.round(prodBoxH / 2);
  const titleBlock = drawFittedWrappedText(
    ctx,
    name,
    layout.product.x,
    prodTopY,
    layout.product.maxW,
    layout.product.font,
    20,
    productMaxLines,
    layout.product.color || textPrimary,
    String(layout.product.weight || 800),
    layout.product.fontFamily || 'Arial',
    prodBoxH,
    'middle'
  );

  // Real price (left-aligned, vertically centered to provided y)
  const prevBaseline = ctx.textBaseline;
  ctx.textBaseline = 'middle';
  ctx.font = `${String(layout.price.weight || 800)} ${layout.price.font}px ${layout.price.fontFamily || 'Arial'}`;
  ctx.fillStyle = layout.price.color || textSecondary;
  ctx.fillText(formatUzs(price), layout.price.x, layout.price.y);
  ctx.textBaseline = prevBaseline;

  const tableTop = layout.table.y;
  const tableX = layout.table.x;
  const tableW = layout.table.w;
  const headerH = layout.table.headerH;
  const rowH = layout.table.rowH;
  const monthsX = layout.tableMonths.x;
  const monthsW = layout.tableMonths.w;
  const priceX = layout.tablePrice.x;
  const priceW = layout.tablePrice.w;
  const col1X = monthsX + 10; // left pad inside months column
  const rightX = priceX + priceW - 10; // right pad inside price column

  // Skip drawing table header/background; rely on template artwork.

  plans.forEach((pl, i) => {
    const monthly = calcMonthly(price, pl.months, pl.percent);
    const row = rowsBoxes && rowsBoxes[i];
    const mCell = row?.months || { x: monthsX, y: tableTop + i * rowH, w: monthsW, h: rowH };
    const pCell = row?.price || { x: priceX, y: tableTop + i * rowH, w: priceW, h: rowH };

    // Months text (left aligned in months cell)
    const mMaxW = Math.max(10, mCell.w - 20);
    const mCenterY = Math.round(mCell.y + mCell.h / 2);
    drawLeftFittedText(
      ctx,
      `${pl.months} oy`,
      mCell.x + 10,
      mCenterY,
      mMaxW,
      layout.tableMonths.font || 54,
      Math.max(18, (layout.tableMonths.font || 54) - 22),
      layout.tableMonths.color || textPrimary,
      String(layout.tableMonths.weight || 900),
      layout.tableMonths.fontFamily || 'Arial'
    );

    // Price amount (right aligned in price cell)
    const amountText = formatSpacedNumber(monthly);
    const suffix = "oy/so'mdan";
    const pMaxW = Math.max(10, pCell.w - 20);
    const pCenterY = Math.round(pCell.y + pCell.h / 2);
    drawRightFittedText(
      ctx,
      amountText,
      pCell.x + pCell.w - 10,
      pCenterY,
      pMaxW,
      layout.tablePrice.font || 52,
      Math.max(18, (layout.tablePrice.font || 52) - 18),
      layout.tablePrice.color || textSecondary,
      String(layout.tablePrice.weight || 900),
      layout.tablePrice.fontFamily || 'Arial'
    );
    ctx.save();
    ctx.textAlign = 'right';
    ctx.fillStyle = (layout.tableSuffix && layout.tableSuffix.color) || (layout.tableMonths.color || textPrimary);
    ctx.font = `${String((layout.tableSuffix && layout.tableSuffix.weight) || 800)} ${(layout.tableSuffix && layout.tableSuffix.font) || 24}px ${(layout.tableSuffix && layout.tableSuffix.fontFamily) || 'Arial'}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(suffix, pCell.x + pCell.w - 10, pCell.y + pCell.h - 6);
    ctx.restore();
  });

  return canvas.toDataURL('image/png');
}

const fieldBoxFromLayout = (layout, field, planCount) => {
  if (field === 'shopName') return { x: layout.shopName.x, y: layout.shopName.y - 56, w: layout.shopName.maxW, h: 72, canResizeH: false };
  if (field === 'logo') return { x: layout.logo.x, y: layout.logo.y, w: layout.logo.maxW, h: layout.logo.maxH, canResizeH: true };
  if (field === 'product') {
    const defaultH = Math.round((layout.product.font || 66) * 1.1 * 3);
    const h = Math.max(40, Math.round(layout.product.boxH || defaultH));
    return { x: layout.product.x, y: layout.product.y - Math.round(h / 2), w: layout.product.maxW, h, canResizeH: true };
  }
  if (field === 'price') {
    const h = Math.max(48, Math.round((layout.price.font || 58) * 1.2));
    return { x: layout.price.x, y: layout.price.y - Math.round(h / 2), w: 360, h, canResizeH: false };
  }
  if (field === 'tableMonths') {
    return {
      x: layout.tableMonths.x,
      y: layout.table.y - layout.table.headerH,
      w: layout.tableMonths.w,
      h: layout.table.headerH + layout.table.rowH * Math.max(planCount, 1),
      canResizeH: true
    };
  }
  if (field === 'tablePrice') {
    return {
      x: layout.tablePrice.x,
      y: layout.table.y - layout.table.headerH,
      w: layout.tablePrice.w,
      h: layout.table.headerH + layout.table.rowH * Math.max(planCount, 1),
      canResizeH: true
    };
  }
  return {
    x: layout.table.x,
    y: layout.table.y - layout.table.headerH,
    w: layout.table.w,
    h: layout.table.headerH + layout.table.rowH * Math.max(planCount, 1),
    canResizeH: true
  };
};

export default function App() {
  const canvasRef = useRef(null);
  const previewBoardRef = useRef(null);
  const dragRef = useRef(null);

  const [companyName, setCompanyName] = useState('');
  const [theme, setTheme] = useState('light');
  const [size, setSize] = useState('lg');
  const [manualProducts, setManualProducts] = useState([{ id: createId(), name: '', price: '' }]);
  const [plans, setPlans] = useState([
    { id: createId(), months: '3', percent: '15' },
  ]);
  const [logoUrl, setLogoUrl] = useState('');
  const [templateUrl, setTemplateUrl] = useState('');
  const [layout, setLayout] = useState(defaultLayout);
  const [selectedField, setSelectedField] = useState('product');
  const [multiSelected, setMultiSelected] = useState([]); // array of field keys selected via right-click
  const [inspectorTab, setInspectorTab] = useState('text');
  const [activePage, setActivePage] = useState('auto');

  const [manualImgs, setManualImgs] = useState([]);
  const [excelImgs, setExcelImgs] = useState([]);
  const [excelData, setExcelData] = useState([]);
  const [excelError, setExcelError] = useState('');
  const [planError, setPlanError] = useState('');
  const [logoFileName, setLogoFileName] = useState('');
  const [templateFileName, setTemplateFileName] = useState('');
  const [excelFileName, setExcelFileName] = useState('');
  const [isGeneratingAuto, setIsGeneratingAuto] = useState(false);
  const [isGeneratingManual, setIsGeneratingManual] = useState(false);

  useEffect(() => () => {
    if (logoUrl) URL.revokeObjectURL(logoUrl);
    if (templateUrl) URL.revokeObjectURL(templateUrl);
  }, [logoUrl, templateUrl]);

  const validPlans = useMemo(() => {
    return plans
      .map(p => ({ months: Number(p.months), percent: Number(p.percent) }))
      .filter(p => Number.isFinite(p.months) && p.months > 0 && Number.isFinite(p.percent) && p.percent >= 0)
      .sort((a, b) => a.months - b.months);
  }, [plans]);

  const allCount = manualImgs.length + excelImgs.length;

  const rowsDerived = useMemo(() => {
    const cnt = Math.max(0, validPlans.length);
    const rows = Array.isArray(layout.rows) ? layout.rows.slice(0, cnt) : [];
    const need = cnt - rows.length;
    const filled = [...rows];
    for (let i = 0; i < need; i += 1) {
      const y = layout.table.y + (rows.length + i) * layout.table.rowH;
      filled.push({
        months: { x: layout.tableMonths.x, y, w: layout.tableMonths.w, h: layout.table.rowH },
        price: { x: layout.tablePrice.x, y, w: layout.tablePrice.w, h: layout.table.rowH }
      });
    }
    return filled;
  }, [layout, validPlans.length]);

  const fieldBoxes = useMemo(() => {
    const statics = ['product', 'price'].map(field => ({
      field,
      ...fieldBoxFromLayout(layout, field, validPlans.length)
    }));
    const dynamic = rowsDerived.flatMap((r, i) => ([
      { field: `rowMonths:${i}`, x: r.months.x, y: r.months.y, w: r.months.w, h: r.months.h, canResizeH: true },
      { field: `rowPrice:${i}`, x: r.price.x, y: r.price.y, w: r.price.w, h: r.price.h, canResizeH: true }
    ]));
    return [...statics, ...dynamic];
  }, [layout, validPlans.length, rowsDerived]);

  const updateLayoutField = (field, key, value, min = null) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    setLayout(prev => {
      const nextValue = min !== null ? Math.max(min, n) : n;
      return {
        ...prev,
        [field]: { ...prev[field], [key]: nextValue }
      };
    });
  };

  const updateLayoutColor = (field, value) => {
    setLayout(prev => ({
      ...prev,
      [field]: { ...prev[field], color: value }
    }));
  };

  const updateLayoutString = (field, key, value) => {
    setLayout(prev => ({
      ...prev,
      [field]: { ...prev[field], [key]: value }
    }));
  };

  const selectedKeys = multiSelected.length ? multiSelected : (selectedField ? [selectedField] : []);
  const hasSelection = selectedKeys.length > 0;
  const selectionKind = useMemo(() => {
    if (!selectedKeys.length) return 'none';
    const allMonths = selectedKeys.every(k => k.startsWith('rowMonths'));
    const allPrice = selectedKeys.every(k => k.startsWith('rowPrice'));
    if (allMonths) return 'rowMonths';
    if (allPrice) return 'rowPrice';
    if (selectedKeys.length === 1) return selectedKeys[0];
    return 'mixed';
  }, [selectedKeys]);

  const styleTarget = useMemo(() => {
    if (!hasSelection) return 'product';
    if (selectionKind === 'rowMonths') return 'tableMonths';
    if (selectionKind === 'rowPrice') return 'tablePrice';
    if (selectionKind === 'price') return 'price';
    if (selectionKind === 'product') return 'product';
    // fallback: map by selectedField
    return selectedField.startsWith('rowMonths')
      ? 'tableMonths'
      : selectedField.startsWith('rowPrice')
        ? 'tablePrice'
        : selectedField === 'price'
          ? 'price'
          : 'product';
  }, [hasSelection, selectionKind, selectedField]);

  const updateRowBox = (key, patch) => {
    if (!key.startsWith('row')) return;
    const [kind, idxStr] = key.split(':');
    const idx = Number(idxStr);
    setLayout(prev => {
      const rowsArr = Array.isArray(prev.rows) ? [...prev.rows] : [];
      while (rowsArr.length <= idx) {
        rowsArr.push({
          months: { x: prev.tableMonths.x, y: prev.table.y + rowsArr.length * prev.table.rowH, w: prev.tableMonths.w, h: prev.table.rowH },
          price: { x: prev.tablePrice.x, y: prev.table.y + rowsArr.length * prev.table.rowH, w: prev.tablePrice.w, h: prev.table.rowH }
        });
      }
      const targetKey = kind === 'rowMonths' ? 'months' : 'price';
      rowsArr[idx] = { ...rowsArr[idx], [targetKey]: { ...rowsArr[idx][targetKey], ...patch } };
      return { ...prev, rows: rowsArr };
    });
  };

  const updateSelectionBoxNumber = (prop, value, min = null) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    const v = min !== null ? Math.max(min, n) : n;

    if (selectionKind === 'rowMonths' || selectionKind === 'rowPrice') {
      selectedKeys.forEach(k => updateRowBox(k, { [prop]: v }));
      return;
    }

    if (selectionKind === 'product') {
      if (prop === 'w') updateLayoutField('product', 'maxW', v, 1);
      else if (prop === 'h') updateLayoutField('product', 'boxH', v, 20);
      else if (prop === 'x') updateLayoutField('product', 'x', v);
      else if (prop === 'y') updateLayoutField('product', 'y', v);
      return;
    }
    if (selectionKind === 'price') {
      if (prop === 'x') updateLayoutField('price', 'x', v);
      else if (prop === 'y') updateLayoutField('price', 'y', v);
      return;
    }
  };

  const onUploadImage = (event, setter, previousUrl, setFileName) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    setter(URL.createObjectURL(file));
    if (setFileName) setFileName(file.name);
    event.target.value = '';
  };

  const removeLogo = () => {
    if (logoUrl) URL.revokeObjectURL(logoUrl);
    setLogoUrl('');
    setLogoFileName('');
  };

  const removeTemplate = () => {
    if (templateUrl) URL.revokeObjectURL(templateUrl);
    setTemplateUrl('');
    setTemplateFileName('');
  };

  const addManual = () => setManualProducts(prev => [...prev, { id: createId(), name: '', price: '' }]);

  const removeManual = id => {
    setManualProducts(prev => (prev.length > 1 ? prev.filter(r => r.id !== id) : prev));
  };

  const updateManual = (id, key, value) => {
    setManualProducts(prev => prev.map(row => (row.id === id ? { ...row, [key]: value } : row)));
  };

  const addPlan = () => setPlans(prev => [...prev, { id: createId(), months: '', percent: '' }]);

  const removePlan = id => {
    setPlans(prev => (prev.length > 1 ? prev.filter(r => r.id !== id) : prev));
  };

  const updatePlanRow = (id, key, value) => {
    setPlans(prev => prev.map(row => (row.id === id ? { ...row, [key]: value } : row)));
  };

  const onExcelChange = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setExcelFileName(file.name);

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const sheet = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
        const rows = (sheet || []).filter(r => Array.isArray(r) && (r[0] !== undefined || r[1] !== undefined));

        let start = 0;
        if (rows.length) {
          const h0 = String(rows[0][0] ?? '').toLowerCase();
          const h1 = String(rows[0][1] ?? '').toLowerCase();
          const looksHeader = h0.includes('nom') || h0.includes('product') || h1.includes('narx') || h1.includes('price');
          if (looksHeader) start = 1;
        }

        const parsed = rows
          .slice(start)
          .map(r => ({ name: String(r[0] ?? '').trim(), price: parsePrice(r[1]) }))
          .filter(x => x.name && Number.isFinite(x.price) && x.price > 0);

        setExcelData(parsed);
        setExcelError(parsed.length ? '' : "Excel faylda to'g'ri ma'lumot topilmadi (2 ustun: nomi va narxi).");
      } catch {
        setExcelData([]);
        setExcelError("Excel faylni o'qib bo'lmadi. Formatni tekshiring (.xlsx).");
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const generateItems = async rows => {
    if (!validPlans.length) {
      setPlanError("Nasiya shartlarini to'g'ri kiriting (oy > 0, foiz >= 0).");
      return null;
    }
    setPlanError('');

    const canvas = canvasRef.current;
    if (!canvas) return null;

    const [logoImage, templateImage] = await Promise.all([loadImage(logoUrl), loadImage(templateUrl)]);
    const items = [];
    for (const row of rows) {
      const name = (row.name || '').trim();
      const price = Number(row.price);
      if (!(name && Number.isFinite(price) && price > 0)) continue;

      const img = drawSennik({
        canvas,
        companyName,
        name,
        price,
        theme,
        size,
        plans: validPlans,
        layout,
        rowsBoxes: rowsDerived,
        logoImage,
        templateImage
      });
      items.push({ name, price, img, theme, size });
    }
    return items;
  };

  const generateManual = async () => {
    setIsGeneratingManual(true);
    const manualRows = manualProducts
      .map(row => ({ name: (row.name || '').trim(), price: parsePrice(row.price) }))
      .filter(row => row.name || Number.isFinite(row.price));

    try {
      const items = await generateItems(manualRows);
      if (items) setManualImgs(items);
    } finally {
      setIsGeneratingManual(false);
    }
  };

  const generateAutomatic = async () => {
    setIsGeneratingAuto(true);
    try {
      const items = await generateItems(excelData);
      if (items) setExcelImgs(items);
    } finally {
      setIsGeneratingAuto(false);
    }
  };

  const buildUniqueZipNames = list => {
    const used = new Map();
    return list.map((item, idx) => {
      const base = safeFileName(item.name) || `sennik_${idx + 1}`;
      const c = (used.get(base) || 0) + 1;
      used.set(base, c);
      const unique = c === 1 ? base : `${base}_${c}`;
      return { ...item, __zipName: unique };
    });
  };

  const makeZip = async (list, name) => {
    const zip = new JSZip();
    const items = buildUniqueZipNames(list);
    items.forEach((item, i) => {
      const dataUrl = item.img || item;
      const base64 = String(dataUrl).split(',')[1];
      const fnameBase = item.__zipName || `sennik_${i + 1}`;
      zip.file(`${fnameBase}.png`, base64, { base64: true });
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadPdf = (list, fileName) => {
    if (!list.length) return;

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const pageH = 297;
    const margin = 1;
    const cols = size === 'sm' ? 5 : size === 'md' ? 4 : 3;
    const rows = size === 'sm' ? 5 : size === 'md' ? 4 : 3;
    const cellW = (pageW - margin * 2) / cols;
    const cellH = (pageH - margin * 2) / rows;
    const pad = 0.25;

    const perPage = cols * rows;
    for (let i = 0; i < list.length; i += 1) {
      if (i > 0 && i % perPage === 0) doc.addPage();

      const pos = i % perPage;
      const c = pos % cols;
      const r = Math.floor(pos / cols);
      const x = margin + c * cellW;
      const y = margin + r * cellH;
      const item = list[i];
      const fitW = cellW - pad * 2;
      const fitH = cellH - pad * 2;

      if (item.theme === 'dark') {
        doc.setFillColor(0, 0, 0);
        doc.rect(x, y, cellW, cellH, 'F');
      }

      const aspect = BASE_W / BASE_H;
      let drawW = fitW;
      let drawH = drawW / aspect;
      if (drawH > fitH) {
        drawH = fitH;
        drawW = drawH * aspect;
      }
      const dx = x + (cellW - drawW) / 2;
      const dy = y + (cellH - drawH) / 2;
      doc.addImage(item.img, 'PNG', dx, dy, drawW, drawH);
    }

    doc.save(fileName);
  };

  const onFieldDragStart = (event, field) => {
    const board = previewBoardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const scaleX = BASE_W / rect.width;
    const scaleY = BASE_H / rect.height;
    const box = field.startsWith('row')
      ? (() => {
          const [kind, idxStr] = field.split(':');
          const idx = Number(idxStr);
          const r = rowsDerived[idx];
          return kind === 'rowMonths' ? r.months : r.price;
        })()
      : fieldBoxFromLayout(layout, field, validPlans.length);

    dragRef.current = {
      mode: 'move',
      field,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: box.x,
      startY: box.y,
      scaleX,
      scaleY
    };
    setSelectedField(field);
  };

  const onFieldResizeStart = (event, field) => {
    event.stopPropagation();
    const board = previewBoardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const scaleX = BASE_W / rect.width;
    const scaleY = BASE_H / rect.height;
    const box = field.startsWith('row')
      ? (() => {
          const [kind, idxStr] = field.split(':');
          const idx = Number(idxStr);
          const r = rowsDerived[idx];
          return kind === 'rowMonths' ? r.months : r.price;
        })()
      : fieldBoxFromLayout(layout, field, validPlans.length);

    // determine group for multi-resize (only same-kind fields)
    let groupFields = [field];
    if (multiSelected.includes(field)) {
      if (field.startsWith('rowMonths')) groupFields = multiSelected.filter(f => f.startsWith('rowMonths'));
      else if (field.startsWith('rowPrice')) groupFields = multiSelected.filter(f => f.startsWith('rowPrice'));
      else if (field === 'product') groupFields = multiSelected.includes('product') ? ['product'] : ['product'];
      else groupFields = [field];
    }

    dragRef.current = {
      mode: 'resize',
      field,
      groupFields,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startW: box.w,
      startH: box.h,
      scaleX,
      scaleY
    };
    setSelectedField(field);
  };

  useEffect(() => {
    const onMove = event => {
      const drag = dragRef.current;
      if (!drag) return;

      const dx = (event.clientX - drag.startClientX) * drag.scaleX;
      const dy = (event.clientY - drag.startClientY) * drag.scaleY;

      if (drag.mode === 'move') {
        const nextX = Math.max(0, Math.round(drag.startX + dx));
        const nextY = Math.max(0, Math.round(drag.startY + dy));

        setLayout(prev => {
          if (drag.field === 'shopName') return { ...prev, shopName: { ...prev.shopName, x: nextX, y: nextY + 56 } };
          if (drag.field === 'logo') return { ...prev, logo: { ...prev.logo, x: nextX, y: nextY } };
          if (drag.field === 'product') {
            const defaultH = Math.round((prev.product.font || 66) * 1.1 * 3);
            const prodH = Math.max(40, Math.round(prev.product.boxH || defaultH));
            return { ...prev, product: { ...prev.product, x: nextX, y: nextY + Math.round(prodH / 2) } };
          }
          if (drag.field === 'price') {
            const priceH = Math.max(48, Math.round((prev.price.font || 58) * 1.2));
            return { ...prev, price: { ...prev.price, x: nextX, y: nextY + Math.round(priceH / 2) } };
          }
          if (drag.field === 'tableMonths') return { ...prev, tableMonths: { ...prev.tableMonths, x: nextX }, table: { ...prev.table, y: nextY + prev.table.headerH } };
          if (drag.field === 'tablePrice') return { ...prev, tablePrice: { ...prev.tablePrice, x: nextX }, table: { ...prev.table, y: nextY + prev.table.headerH } };
          if (drag.field.startsWith('row')) {
            const [kind, idxStr] = drag.field.split(':');
            const idx = Number(idxStr);
            const rows = Array.isArray(prev.rows) ? [...prev.rows] : [];
            while (rows.length <= idx) rows.push({ months: { x: prev.tableMonths.x, y: prev.table.y + rows.length * prev.table.rowH, w: prev.tableMonths.w, h: prev.table.rowH }, price: { x: prev.tablePrice.x, y: prev.table.y + rows.length * prev.table.rowH, w: prev.tablePrice.w, h: prev.table.rowH } });
            const target = kind === 'rowMonths' ? { ...rows[idx].months, x: nextX, y: nextY } : { ...rows[idx].price, x: nextX, y: nextY };
            rows[idx] = { ...rows[idx], [kind === 'rowMonths' ? 'months' : 'price']: target };
            return { ...prev, rows };
          }
          return { ...prev, table: { ...prev.table, x: nextX, y: nextY + prev.table.headerH } };
        });
      } else {
        const nextW = Math.max(40, Math.round(drag.startW + dx));
        const nextH = Math.max(40, Math.round(drag.startH + dy));
        setLayout(prev => {
          const applyOne = (state, fld) => {
            if (fld === 'logo') {
              return { ...state, logo: { ...state.logo, maxW: nextW, maxH: nextH } };
            }
            if (fld === 'shopName') return { ...state, shopName: { ...state.shopName, maxW: nextW } };
            if (fld === 'product') return { ...state, product: { ...state.product, maxW: nextW, boxH: nextH } };
            if (fld === 'price') return { ...state, price: { ...state.price }, table: { ...state.table } };
            if (fld === 'table') {
              const rows = Math.max(1, validPlans.length);
              const rowH = Math.max(20, Math.round((nextH - state.table.headerH) / rows));
              return { ...state, table: { ...state.table, w: nextW, rowH } };
            }
            if (fld === 'tableMonths') {
              const rows = Math.max(1, validPlans.length);
              const rowH = Math.max(20, Math.round((nextH - state.table.headerH) / rows));
              return { ...state, tableMonths: { ...state.tableMonths, w: nextW }, table: { ...state.table, rowH } };
            }
            if (fld === 'tablePrice') {
              const rows = Math.max(1, validPlans.length);
              const rowH = Math.max(20, Math.round((nextH - state.table.headerH) / rows));
              return { ...state, tablePrice: { ...state.tablePrice, w: nextW }, table: { ...state.table, rowH } };
            }
            if (fld.startsWith('row')) {
              const [kind, idxStr] = fld.split(':');
              const idx = Number(idxStr);
              const rowsArr = Array.isArray(state.rows) ? [...state.rows] : [];
              while (rowsArr.length <= idx) rowsArr.push({ months: { x: state.tableMonths.x, y: state.table.y + rowsArr.length * state.table.rowH, w: state.tableMonths.w, h: state.table.rowH }, price: { x: state.tablePrice.x, y: state.table.y + rowsArr.length * state.table.rowH, w: state.tablePrice.w, h: state.table.rowH } });
              const target = kind === 'rowMonths' ? { ...rowsArr[idx].months, w: nextW, h: nextH } : { ...rowsArr[idx].price, w: nextW, h: nextH };
              rowsArr[idx] = { ...rowsArr[idx], [kind === 'rowMonths' ? 'months' : 'price']: target };
              return { ...state, rows: rowsArr };
            }
            return state;
          };

          // If we have a group selection of same-kind fields, apply to all
          if (Array.isArray(drag.groupFields) && drag.groupFields.length > 1) {
            return drag.groupFields.reduce((acc, fld) => applyOne(acc, fld), prev);
          }

          // Fallback: single field behavior
          if (drag.field === 'logo') {
            return { ...prev, logo: { ...prev.logo, maxW: nextW, maxH: nextH } };
          }
          if (drag.field === 'shopName') return { ...prev, shopName: { ...prev.shopName, maxW: nextW } };
          if (drag.field === 'product') return { ...prev, product: { ...prev.product, maxW: nextW, boxH: nextH } };
          if (drag.field === 'price') return { ...prev, price: { ...prev.price }, table: { ...prev.table } }; // width/height no-op for price box visuals
          if (drag.field === 'table') {
            const rows = Math.max(1, validPlans.length);
            const rowH = Math.max(20, Math.round((nextH - prev.table.headerH) / rows));
            return { ...prev, table: { ...prev.table, w: nextW, rowH } };
          }
          if (drag.field === 'tableMonths') {
            const rows = Math.max(1, validPlans.length);
            const rowH = Math.max(20, Math.round((nextH - prev.table.headerH) / rows));
            return { ...prev, tableMonths: { ...prev.tableMonths, w: nextW }, table: { ...prev.table, rowH } };
          }
          if (drag.field === 'tablePrice') {
            const rows = Math.max(1, validPlans.length);
            const rowH = Math.max(20, Math.round((nextH - prev.table.headerH) / rows));
            return { ...prev, tablePrice: { ...prev.tablePrice, w: nextW }, table: { ...prev.table, rowH } };
          }
          if (drag.field.startsWith('row')) {
            const [kind, idxStr] = drag.field.split(':');
            const idx = Number(idxStr);
            const rowsArr = Array.isArray(prev.rows) ? [...prev.rows] : [];
            while (rowsArr.length <= idx) rowsArr.push({ months: { x: prev.tableMonths.x, y: prev.table.y + rowsArr.length * prev.table.rowH, w: prev.tableMonths.w, h: prev.table.rowH }, price: { x: prev.tablePrice.x, y: prev.table.y + rowsArr.length * prev.table.rowH, w: prev.tablePrice.w, h: prev.table.rowH } });
            const target = kind === 'rowMonths' ? { ...rowsArr[idx].months, w: nextW, h: nextH } : { ...rowsArr[idx].price, w: nextW, h: nextH };
            rowsArr[idx] = { ...rowsArr[idx], [kind === 'rowMonths' ? 'months' : 'price']: target };
            return { ...prev, rows: rowsArr };
          }
          return prev;
        });
      }
    };

    const onUp = () => {
      dragRef.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [layout, validPlans.length]);

  const renderPreviewSection = (title, items) => (
    <>
      <div className="section-header">
        <div>
          <h3>{title}</h3>
          <p>Generated sheets appear here with instant download actions.</p>
        </div>
      </div>
      <div className="preview-grid premium-preview-grid">
        {items.map(item => {
          const safe = safeFileName(item.name) || 'sennik';
          return (
            <div className="preview-card" key={`${safe}_${item.price}`}>
              <div className="preview-card-top">
                <div>
                  <div className="preview-name">{item.name}</div>
                  <div className="preview-meta">{formatUzs(item.price)}</div>
                </div>
                <div className={`preview-badge ${item.theme === 'dark' ? 'is-dark' : ''}`}>{item.size.toUpperCase()}</div>
              </div>
              <img src={item.img} alt={safe} />
              <div className="preview-actions">
                <a className="secondary" href={item.img} download={`${safe}.png`}>
                  <Icon name="upload" size={16} />
                  <span>Download PNG</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="container">
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="sidebar-kicker">Sennik</div>
            <h1>Generator Pro</h1>
            <p>Default sahifa avtomatik yaratish bo‘lib ochiladi. Sidebar orqali manual bo‘limga o‘tasiz.</p>
          </div>

          <div className="sidebar-nav">
            <button type="button" className={`sidebar-link ${activePage === 'auto' ? 'is-active' : ''}`} onClick={() => setActivePage('auto')}>
              <span>Avtomatik yaratish</span>
              <small>Excel asosida senniklar</small>
            </button>
            <button type="button" className={`sidebar-link ${activePage === 'manual' ? 'is-active' : ''}`} onClick={() => setActivePage('manual')}>
              <span>Manual yaratish</span>
              <small>Rasm va qo‘lda kiritish</small>
            </button>
          </div>
        </aside>

        <main className="content">
          {activePage === 'auto' ? (
            <>
              <div className="page-hero card">
                <div>
                  <div className="page-kicker">Premium automation</div>
                  <h2>Automatic Invoice Generator</h2>
                  <p>Upload Excel data, apply installment rules, and generate polished price sheets in seconds.</p>
                </div>
              </div>

              <div className="card section-title">Asosiy sozlamalar</div>

              <div className="card">
                <div className="section-header">
                  <div>
                    <h3>Company Settings</h3>
                    <p>Brand your exported documents with company details and logo.</p>
                  </div>
                </div>

                <label>Company Name</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Enter your company or store name" />

                <label>Company Logo</label>
                <div className="logo-box">
                  <label className="upload-dropzone">
                    <input className="sr-only" type="file" accept="image/*" onChange={e => onUploadImage(e, setLogoUrl, logoUrl, setLogoFileName)} />
                    <div className="upload-icon"><Icon name="upload" size={22} /></div>
                    <div className="upload-title">Upload your logo</div>
                    <div className="upload-subtitle">Drag and drop or click to browse PNG, JPG, SVG files</div>
                  </label>
                  {logoUrl ? (
                    <div className="file-preview">
                      <img src={logoUrl} alt="Logo" />
                      <div>
                        <div className="file-name">{logoFileName || 'Logo uploaded'}</div>
                        <div className="file-meta">Brand asset ready for export</div>
                      </div>
                      <button type="button" className="ghost-danger" onClick={removeLogo}>
                        <Icon name="trash" size={16} />
                        <span>Remove</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="card">
                <div className="section-header">
                  <div>
                    <h3>Installment Settings</h3>
                    <p>Define payment terms once and apply them across all generated sheets.</p>
                  </div>
                </div>
                {planError ? <div className="inline-error">{planError}</div> : null}
                <div className="plans">
                  {plans.map(row => (
                    <div className="plan-row" key={row.id}>
                      <input value={row.months} onChange={e => updatePlanRow(row.id, 'months', e.target.value)} inputMode="numeric" placeholder="Months" />
                      <span className="plan-tag">Months</span>
                      <input value={row.percent} onChange={e => updatePlanRow(row.id, 'percent', e.target.value)} inputMode="decimal" placeholder="Percentage" />
                      <span className="plan-tag">%</span>
                      <button type="button" className="plan-del" onClick={() => removePlan(row.id)}><Icon name="trash" size={14} /></button>
                    </div>
                  ))}
                </div>
                <button type="button" className="ghost-btn" onClick={addPlan}>
                  <Icon name="plus" size={16} />
                  <span>Add row</span>
                </button>
              </div>

              <div className="card">
                <div className="section-header">
                  <div>
                    <h3>Appearance Settings</h3>
                    <p>Fine-tune background style and export sizing.</p>
                  </div>
                </div>
                <div className="settings-grid">
                  <div>
                    <div className="settings-label">Background</div>
                    <div className="theme-toggle">
                      <button type="button" className={`theme-btn ${theme === 'light' ? 'is-active' : ''}`} onClick={() => setTheme('light')}>White</button>
                      <button type="button" className={`theme-btn ${theme === 'dark' ? 'is-active' : ''}`} onClick={() => setTheme('dark')}>Dark</button>
                    </div>
                  </div>
                  <div>
                    <div className="settings-label">Size</div>
                    <div className="size-toggle">
                      <button type="button" className={`size-btn ${size === 'lg' ? 'is-active' : ''}`} onClick={() => setSize('lg')}>Large</button>
                      <button type="button" className={`size-btn ${size === 'md' ? 'is-active' : ''}`} onClick={() => setSize('md')}>Medium</button>
                      <button type="button" className={`size-btn ${size === 'sm' ? 'is-active' : ''}`} onClick={() => setSize('sm')}>Small</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="section-header">
                  <div>
                    <h3>Excel Import</h3>
                    <p>Bring in product names and prices from a spreadsheet.</p>
                  </div>
                </div>
                {excelError ? <div className="inline-error">{excelError}</div> : null}
                <label className="upload-dropzone upload-dropzone-excel">
                  <input className="sr-only" type="file" accept=".xlsx" onChange={onExcelChange} />
                  <div className="upload-icon excel"><Icon name="excel" size={22} /></div>
                  <div className="upload-title">Upload Excel file</div>
                  <div className="upload-subtitle">Column 1: Product name, Column 2: Price</div>
                </label>
                {excelFileName ? (
                  <div className="file-preview success">
                    <div className="success-badge"><Icon name="check" size={16} /></div>
                    <div>
                      <div className="file-name">{excelFileName}</div>
                      <div className="file-meta">{excelData.length} rows imported and ready to generate</div>
                    </div>
                  </div>
                ) : null}
              </div>

              <button className={`primary primary-hero ${isGeneratingAuto ? 'is-loading' : ''}`} type="button" onClick={generateAutomatic} disabled={isGeneratingAuto}>
                <Icon name="sparkles" size={18} />
                <span>{isGeneratingAuto ? 'Generating...' : 'Generate Invoice'}</span>
              </button>

              <div className="card live-preview-card">
                <div className="section-header">
                  <div>
                    <h3>Live Preview</h3>
                    <p>A polished preview of your generated invoice style.</p>
                  </div>
                </div>
                <div className="invoice-mock">
                  <div className="invoice-mock-top">
                    <div>
                      <div className="invoice-brand">{companyName || 'Generator Pro Store'}</div>
                      <div className="invoice-label">Installment invoice preview</div>
                    </div>
                    <div className="invoice-pill">{theme === 'dark' ? 'Dark theme' : 'Light theme'}</div>
                  </div>
                  <div className="invoice-mock-product">{excelData[0]?.name || 'iPhone 15 Pro Max'}</div>
                  <div className="invoice-mock-price">{formatUzs(excelData[0]?.price || 14999000)}</div>
                  <div className="invoice-grid">
                    {validPlans.slice(0, 3).map(plan => (
                      <div key={`${plan.months}-${plan.percent}`} className="invoice-grid-row">
                        <span>{plan.months} months</span>
                        <strong>{formatUzs(calcMonthly(excelData[0]?.price || 14999000, plan.months, plan.percent))}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {renderPreviewSection('Generated Sheets', excelImgs)}

              <div className="action-row">
                <button className="soft-btn action-btn" type="button" disabled={!excelImgs.length} onClick={() => makeZip(excelImgs, 'excel_senniklar.zip')}>
                  <Icon name="zip" size={16} />
                  <span>Export ZIP</span>
                </button>
                <button className="soft-btn action-btn" type="button" disabled={!excelImgs.length} onClick={() => downloadPdf(excelImgs, 'excel_senniklar.pdf')}>
                  <Icon name="pdf" size={16} />
                  <span>Export PDF</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="page-hero card">
                <div>
                  <div className="page-kicker">Manual studio</div>
                  <h2>Manual Invoice Studio</h2>
                  <p>Compose premium price sheets with manual product input, custom backgrounds, and precise layout control.</p>
                </div>
              </div>

              <div className="card section-title">Manual sozlamalar</div>

              <div className="card">
                <div className="section-header">
                  <div>
                    <h3>Company Settings</h3>
                    <p>Set your manual invoice branding before arranging the layout.</p>
                  </div>
                </div>

                <label>Company Name</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Enter your company or store name" />

                <label>Company Logo</label>
                <div className="logo-box">
                  <label className="upload-dropzone">
                    <input className="sr-only" type="file" accept="image/*" onChange={e => onUploadImage(e, setLogoUrl, logoUrl, setLogoFileName)} />
                    <div className="upload-icon"><Icon name="upload" size={22} /></div>
                    <div className="upload-title">Upload your logo</div>
                    <div className="upload-subtitle">Drag and drop or click to browse PNG, JPG, SVG files</div>
                  </label>
                  {logoUrl ? (
                    <div className="file-preview">
                      <img src={logoUrl} alt="Logo" />
                      <div>
                        <div className="file-name">{logoFileName || 'Logo uploaded'}</div>
                        <div className="file-meta">Ready for manual layout</div>
                      </div>
                      <button type="button" className="ghost-danger" onClick={removeLogo}>
                        <Icon name="trash" size={16} />
                        <span>Remove</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="card">
                <div className="section-header">
                  <div>
                    <h3>Installment Settings</h3>
                    <p>Use consistent financing rules inside manual mode as well.</p>
                  </div>
                </div>
                {planError ? <div className="inline-error">{planError}</div> : null}
                <div className="plans">
                  {plans.map(row => (
                    <div className="plan-row" key={row.id}>
                      <input value={row.months} onChange={e => updatePlanRow(row.id, 'months', e.target.value)} inputMode="numeric" placeholder="Months" />
                      <span className="plan-tag">Months</span>
                      <input value={row.percent} onChange={e => updatePlanRow(row.id, 'percent', e.target.value)} inputMode="decimal" placeholder="Percentage" />
                      <span className="plan-tag">%</span>
                      <button type="button" className="plan-del" onClick={() => removePlan(row.id)}><Icon name="trash" size={14} /></button>
                    </div>
                  ))}
                </div>
                <button type="button" className="ghost-btn" onClick={addPlan}>
                  <Icon name="plus" size={16} />
                  <span>Add row</span>
                </button>
              </div>

              <div className="card">
                <div className="section-header">
                  <div>
                    <h3>Appearance Settings</h3>
                    <p>Adjust background and sheet density for the final output.</p>
                  </div>
                </div>
                <div className="settings-grid">
                  <div>
                    <div className="settings-label">Background</div>
                    <div className="theme-toggle">
                      <button type="button" className={`theme-btn ${theme === 'light' ? 'is-active' : ''}`} onClick={() => setTheme('light')}>White</button>
                      <button type="button" className={`theme-btn ${theme === 'dark' ? 'is-active' : ''}`} onClick={() => setTheme('dark')}>Dark</button>
                    </div>
                  </div>
                  <div>
                    <div className="settings-label">Size</div>
                    <div className="size-toggle">
                      <button type="button" className={`size-btn ${size === 'lg' ? 'is-active' : ''}`} onClick={() => setSize('lg')}>Large</button>
                      <button type="button" className={`size-btn ${size === 'md' ? 'is-active' : ''}`} onClick={() => setSize('md')}>Medium</button>
                      <button type="button" className={`size-btn ${size === 'sm' ? 'is-active' : ''}`} onClick={() => setSize('sm')}>Small</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="section-header">
                  <div>
                    <h3>Manual Products</h3>
                    <p>Add products one by one for a curated invoice sheet.</p>
                  </div>
                </div>
                {manualProducts.map(row => (
                  <div className="manual-row" key={row.id}>
                    <input value={row.name} onChange={e => updateManual(row.id, 'name', e.target.value)} placeholder="Product name" />
                    <input value={row.price} onChange={e => updateManual(row.id, 'price', e.target.value)} placeholder="Price" inputMode="decimal" />
                    <button type="button" className="danger" onClick={() => removeManual(row.id)}><Icon name="trash" size={14} /></button>
                  </div>
                ))}
                <button type="button" className="ghost-btn" onClick={addManual}>
                  <Icon name="plus" size={16} />
                  <span>Add product</span>
                </button>
              </div>

              <div className="card section-title">Shablon ustida maydon belgilash</div>

              <div className="card">
                <div className="section-header">
                  <div>
                    <h3>Editable Canvas</h3>
                    <p>Upload a background and drag invoice blocks into the perfect place.</p>
                  </div>
                </div>
                <label>Background Template</label>
                <div className="logo-box">
                  <label className="upload-dropzone">
                    <input className="sr-only" type="file" accept="image/*" onChange={e => onUploadImage(e, setTemplateUrl, templateUrl, setTemplateFileName)} />
                    <div className="upload-icon"><Icon name="upload" size={22} /></div>
                    <div className="upload-title">Upload canvas background</div>
                    <div className="upload-subtitle">Use a photo, branded banner, or clean poster background</div>
                  </label>
                  {templateUrl ? (
                    <div className="file-preview">
                      <img src={templateUrl} alt="Template" />
                      <div>
                        <div className="file-name">{templateFileName || 'Template uploaded'}</div>
                        <div className="file-meta">Canvas background is active</div>
                      </div>
                      <button type="button" className="ghost-danger" onClick={removeTemplate}>
                        <Icon name="trash" size={16} />
                        <span>Remove</span>
                      </button>
                    </div>
                  ) : null}
                </div>

                <p className="hint">Drag blocks to reposition them. Use the bottom-right handle to resize fields smoothly.</p>

                <div className="template-workspace">
                  <div className="template-editor">
                    <div
                      className={`template-board ${templateUrl ? '' : 'is-empty'}`}
                      ref={previewBoardRef}
                      style={templateUrl ? { backgroundImage: `url(${templateUrl})` } : undefined}
                    >
                      {fieldBoxes.map(box => (
                        <button
                          type="button"
                          key={box.field}
                          className={`field-box ${(selectedField === box.field || multiSelected.includes(box.field)) ? 'is-active' : ''}`}
                          style={{
                            left: `${(box.x / BASE_W) * 100}%`,
                            top: `${(box.y / BASE_H) * 100}%`,
                            width: `${(box.w / BASE_W) * 100}%`,
                            height: `${(box.h / BASE_H) * 100}%`
                          }}
                          onMouseDown={e => onFieldDragStart(e, box.field)}
                          onClick={() => { setSelectedField(box.field); setMultiSelected([box.field]); }}
                          onContextMenu={e => { e.preventDefault(); setSelectedField(box.field); setMultiSelected(prev => prev.includes(box.field) ? prev.filter(f => f !== box.field) : [...prev, box.field]); }}
                        >
                          <span>{
                            box.field.startsWith('rowMonths')
                              ? `Oy ${Number(box.field.split(':')[1]) + 1}`
                              : box.field.startsWith('rowPrice')
                                ? `Narx ${Number(box.field.split(':')[1]) + 1}`
                                : fieldTitles[box.field]
                          }</span>
                          <i className="resize-handle" onMouseDown={e => onFieldResizeStart(e, box.field)} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <aside className="inspector">
                    <div className="inspector-head">
                      <div className="inspector-title">
                        {hasSelection
                          ? (selectionKind === 'rowMonths'
                            ? `Oy kataklari (${selectedKeys.length})`
                            : selectionKind === 'rowPrice'
                              ? `Narx kataklari (${selectedKeys.length})`
                              : selectionKind === 'product'
                                ? 'Mahsulot nomi'
                                : selectionKind === 'price'
                                  ? 'Asl narx'
                                  : selectionKind === 'mixed'
                                    ? `Tanlangan (${selectedKeys.length})`
                                    : fieldTitles[selectedField])
                          : 'Inspector'}
                      </div>
                      <div className="inspector-sub">
                        {hasSelection ? `Tanlangan: ${selectedKeys.length} ta` : "Maydondan birini bosing (yoki right-click bilan bir nechta tanlang)"}
                      </div>
                    </div>

                    <div className="inspector-tabs">
                      <button type="button" className={`inspector-tab ${inspectorTab === 'text' ? 'is-active' : ''}`} onClick={() => setInspectorTab('text')}>Text</button>
                      <button type="button" className={`inspector-tab ${inspectorTab === 'position' ? 'is-active' : ''}`} onClick={() => setInspectorTab('position')}>Position</button>
                      <button type="button" className={`inspector-tab ${inspectorTab === 'size' ? 'is-active' : ''}`} onClick={() => setInspectorTab('size')}>Size</button>
                    </div>

                    {!hasSelection ? (
                      <div className="inspector-empty">
                        <div className="inspector-empty-title">Boshlash uchun</div>
                        <div className="inspector-empty-text">
                          Shablondagi maydonni chap bosib tanlang.
                          <br />Bir nechta katak tanlash uchun right-click qiling.
                        </div>
                      </div>
                    ) : null}

                    {hasSelection && inspectorTab === 'text' ? (
                      <div className="inspector-body">
                        {(() => {
                          const styleObj = layout[styleTarget] || {};
                          const families = ['Inter', 'Roboto', 'Poppins', 'Montserrat', 'Nunito', 'Arial', 'system-ui'];
                          const weights = [
                            { v: '400', label: 'Regular' },
                            { v: '600', label: 'SemiBold' },
                            { v: '700', label: 'Bold' },
                            { v: '800', label: 'ExtraBold' },
                            { v: '900', label: 'Black' }
                          ];
                          const swatches = ['#111827', '#0f172a', '#ffffff', '#fbbf24', '#ef4444', '#22c55e', '#10b981', '#3b82f6', '#6366f1', '#a855f7', '#f59e0b'];
                          return (
                            <>
                              <div className="inspector-group">
                                <div className="inspector-label">Font</div>
                                <select className="typebar-select" value={styleObj.fontFamily || 'Inter'} onChange={e => updateLayoutString(styleTarget, 'fontFamily', e.target.value)}>
                                  {families.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                              </div>

                              <div className="inspector-row">
                                <div className="inspector-group">
                                  <div className="inspector-label">Size</div>
                                  <input className="typebar-size" type="number" value={styleObj.font || 24} onChange={e => updateLayoutField(styleTarget, 'font', e.target.value, 6)} />
                                </div>
                                <div className="inspector-group">
                                  <div className="inspector-label">Color</div>
                                  <input className="typebar-color" type="color" value={styleObj.color || '#111827'} onChange={e => updateLayoutColor(styleTarget, e.target.value)} />
                                </div>
                              </div>

                              <div className="inspector-group">
                                <div className="inspector-label">Weight</div>
                                <div className="btn-group">
                                  {weights.map(w => (
                                    <button type="button" key={w.v} className={`btn ${String(styleObj.weight || '800') === w.v ? 'is-active' : ''}`} onClick={() => updateLayoutString(styleTarget, 'weight', w.v)}>{w.label}</button>
                                  ))}
                                </div>
                              </div>

                              <div className="inspector-group">
                                <div className="inspector-label">Swatches</div>
                                <div className="typebar-row swatches">
                                  {swatches.map(c => (
                                    <button type="button" key={c} className="swatch" style={{ backgroundColor: c }} onClick={() => updateLayoutColor(styleTarget, c)} />
                                  ))}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ) : null}

                    {hasSelection && inspectorTab === 'position' ? (
                      <div className="inspector-body">
                        {selectionKind === 'mixed' ? (
                          <div className="inspector-empty-text">Aralash tanlov. Position sozlamasi hozir faqat bitta turdagi tanlovga ishlaydi.</div>
                        ) : (
                          <div className="inspector-row">
                            <div className="inspector-group">
                              <div className="inspector-label">X</div>
                              <input type="number" value={(() => {
                                if (selectionKind === 'rowMonths' || selectionKind === 'rowPrice') return '';
                                if (selectionKind === 'product') return layout.product.x;
                                if (selectionKind === 'price') return layout.price.x;
                                return '';
                              })()} placeholder={selectionKind.startsWith('row') ? '—' : ''} onChange={e => updateSelectionBoxNumber('x', e.target.value)} />
                            </div>
                            <div className="inspector-group">
                              <div className="inspector-label">Y</div>
                              <input type="number" value={(() => {
                                if (selectionKind === 'rowMonths' || selectionKind === 'rowPrice') return '';
                                if (selectionKind === 'product') return layout.product.y;
                                if (selectionKind === 'price') return layout.price.y;
                                return '';
                              })()} placeholder={selectionKind.startsWith('row') ? '—' : ''} onChange={e => updateSelectionBoxNumber('y', e.target.value)} />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {hasSelection && inspectorTab === 'size' ? (
                      <div className="inspector-body">
                        {selectionKind === 'mixed' ? (
                          <div className="inspector-empty-text">Aralash tanlov. Size sozlamasi hozir faqat bitta turdagi tanlovga ishlaydi.</div>
                        ) : (
                          <div className="inspector-row">
                            <div className="inspector-group">
                              <div className="inspector-label">W</div>
                              <input type="number" placeholder={selectionKind.startsWith('row') ? '—' : ''} value={selectionKind === 'product' ? layout.product.maxW : ''} onChange={e => updateSelectionBoxNumber('w', e.target.value, 1)} />
                            </div>
                            <div className="inspector-group">
                              <div className="inspector-label">H</div>
                              <input type="number" placeholder={selectionKind.startsWith('row') ? '—' : ''} value={selectionKind === 'product' ? Math.max(40, Math.round(layout.product.boxH || ((layout.product.font || 66) * 1.1 * 3))) : ''} onChange={e => updateSelectionBoxNumber('h', e.target.value, 20)} />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </aside>
                </div>
              </div>

              <button className={`primary primary-hero ${isGeneratingManual ? 'is-loading' : ''}`} type="button" onClick={generateManual} disabled={isGeneratingManual}>
                <Icon name="sparkles" size={18} />
                <span>{isGeneratingManual ? 'Generating...' : 'Generate Invoice'}</span>
              </button>

              {renderPreviewSection('Generated Sheets', manualImgs)}

              <div className="action-row">
                <button className="soft-btn action-btn" type="button" disabled={!manualImgs.length} onClick={() => makeZip(manualImgs, 'manual_senniklar.zip')}>
                  <Icon name="zip" size={16} />
                  <span>Export ZIP</span>
                </button>
                <button className="soft-btn action-btn" type="button" disabled={!manualImgs.length} onClick={() => downloadPdf(manualImgs, 'manual_senniklar.pdf')}>
                  <Icon name="pdf" size={16} />
                  <span>Export PDF</span>
                </button>
              </div>
            </>
          )}

          {allCount ? (
            <div className="card summary-card">
              <div className="summary-title">Jami tayyor senniklar</div>
              <div className="summary-stats">Manual: {manualImgs.length} ta, Avtomatik: {excelImgs.length} ta</div>
              <div className="action-row">
                <button className="soft-btn action-btn" type="button" disabled={!allCount} onClick={() => makeZip([...manualImgs, ...excelImgs], 'barcha_senniklar.zip')}>
                  <Icon name="zip" size={16} />
                  <span>Export All ZIP</span>
                </button>
                <button className="soft-btn action-btn" type="button" disabled={!allCount} onClick={() => downloadPdf([...manualImgs, ...excelImgs], 'barcha_senniklar.pdf')}>
                  <Icon name="pdf" size={16} />
                  <span>Export All PDF</span>
                </button>
              </div>
            </div>
          ) : null}
        </main>
      </div>

      <canvas ref={canvasRef} width={BASE_W} height={BASE_H} hidden />
    </div>
  );
}
