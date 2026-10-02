"use client";

import {
  PAYMENT_LABEL, formatInvoiceDate, formatMoney, formatQuantity, wrapText, type InvoiceData
} from "./format";

// بنرسم الفاتورة بـ Canvas مباشرة (مش HTML→صورة) لأن ده بيشتغل بشكل ثابت على
// iOS Safari وأندرويد، والحروف العربية بتتشكّل صح، ومفيش مكتبات خارجية.

const W = 720;               // العرض بالـ CSS px (الصورة النهائية ×2 للجودة)
const SCALE = 2;
const PAD = 36;
const BRAND = "#C62828";
const BRAND_DARK = "#8E1B1B";
const INK = "#1B1B1B";
const MUTED = "#6B6B6B";
const LINE = "#E8E3DC";
const PAPER = "#FFFFFF";
const CREAM = "#FBF7F2";
const OK = "#2E7D32";

function fontFamily() {
  const fam = typeof document !== "undefined" ? getComputedStyle(document.body).fontFamily : "";
  return fam && fam.length > 0 ? fam : "Almarai, Tahoma, sans-serif";
}

type Ctx = CanvasRenderingContext2D;

function setFont(ctx: Ctx, size: number, weight: 400 | 700 | 800, family: string) {
  ctx.font = `${weight} ${size}px ${family}`;
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** يرسم الفاتورة ويرجّع الارتفاع الكلي. dry=true: قياس بس من غير رسم (علشان نعرف الارتفاع قبل ما نعمل الـ canvas). */
function draw(ctx: Ctx, d: InvoiceData, family: string, dry: boolean): number {
  const right = W - PAD;
  const left = PAD;
  const contentW = W - PAD * 2;
  ctx.direction = "rtl";
  ctx.textBaseline = "alphabetic";

  const measure = (size: number, weight: 400 | 700 | 800) => (s: string) => {
    setFont(ctx, size, weight, family);
    return ctx.measureText(s).width;
  };
  const text = (s: string, x: number, y: number, size: number, weight: 400 | 700 | 800, color: string, align: CanvasTextAlign = "right") => {
    if (dry) return;
    setFont(ctx, size, weight, family);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(s, x, y);
  };

  let y = 0;

  // ---------- الهيدر ----------
  const headerH = 128;
  if (!dry) {
    const g = ctx.createLinearGradient(0, 0, W, headerH);
    g.addColorStop(0, BRAND_DARK);
    g.addColorStop(1, BRAND);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, headerH);
    // دوائر زخرفية ناعمة
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.beginPath(); ctx.arc(60, 20, 90, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(150, 120, 60, 0, Math.PI * 2); ctx.fill();
  }
  text(d.brandName, right, 62, 34, 800, "#FFFFFF");
  text("فاتورة طلب", right, 98, 18, 400, "rgba(255,255,255,0.85)");
  text(`# ${d.invoiceNumber}`, left, 58, 22, 700, "#FFFFFF", "left");
  text(formatInvoiceDate(d.dateIso), left, 92, 15, 400, "rgba(255,255,255,0.85)", "left");
  y = headerH + 28;

  // ---------- بيانات العميل ----------
  const infoRows: [string, string][] = [
    ["العميل", d.customerName],
    ["الموبايل", d.customerPhone],
    ["رقم الطلب", d.orderNumber],
    ["الدفع", PAYMENT_LABEL[d.paymentMethod]]
  ];
  if (d.agentName) infoRows.push(["المندوب", d.agentName]);

  const addrLines = wrapText(d.address, contentW - 120, measure(16, 400));
  const infoH = 24 + infoRows.length * 30 + 12 + addrLines.length * 24 + 16;
  if (!dry) {
    roundRect(ctx, left, y, contentW, infoH, 16);
    ctx.fillStyle = CREAM;
    ctx.fill();
  }
  let iy = y + 38;
  for (const [label, value] of infoRows) {
    text(label, right - 18, iy, 15, 400, MUTED);
    text(value, left + 18, iy, 17, 700, INK, "left");
    iy += 30;
  }
  text("العنوان", right - 18, iy + 4, 15, 400, MUTED);
  let ay = iy + 4;
  for (const l of addrLines) {
    text(l, left + 18, ay, 16, 400, INK, "left");
    ay += 24;
  }
  y += infoH + 28;

  // ---------- جدول الأصناف ----------
  // الأعمدة من اليمين: الصنف | الكمية | السعر | الإجمالي
  const colName = right - 14;
  const nameW = 300;
  const colQty = right - nameW - 50;
  const colPrice = right - nameW - 50 - 100;
  const colTotal = left + 64;

  if (!dry) {
    roundRect(ctx, left, y, contentW, 40, 10);
    ctx.fillStyle = INK;
    ctx.fill();
  }
  text("الصنف", colName, y + 26, 15, 700, "#FFFFFF");
  text("الكمية", colQty, y + 26, 15, 700, "#FFFFFF", "center");
  text("السعر", colPrice, y + 26, 15, 700, "#FFFFFF", "center");
  text("الإجمالي", colTotal, y + 26, 15, 700, "#FFFFFF", "center");
  y += 40;

  d.lines.forEach((line, i) => {
    const nameLines = wrapText(line.name, nameW, measure(16, 700));
    const rowH = Math.max(46, 20 + nameLines.length * 22 + 8);
    if (!dry && i % 2 === 1) {
      ctx.fillStyle = CREAM;
      ctx.fillRect(left, y, contentW, rowH);
    }
    const color = line.available ? INK : "#A0A0A0";
    let ny = y + 28;
    for (const nl of nameLines) {
      text(nl, colName, ny, 16, 700, color);
      if (!dry && !line.available) {
        setFont(ctx, 16, 700, family);
        const w = ctx.measureText(nl).width;
        ctx.strokeStyle = "#A0A0A0";
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(colName - w, ny - 5); ctx.lineTo(colName, ny - 5); ctx.stroke();
      }
      ny += 22;
    }
    const mid = y + rowH / 2 + 5;
    if (line.available) {
      text(`${formatQuantity(line.quantity)} ${line.unit}`, colQty, mid, 14, 400, MUTED, "center");
      text(line.unitPrice !== null ? formatMoney(line.unitPrice) : "—", colPrice, mid, 15, 400, INK, "center");
      text(formatMoney(line.lineTotal), colTotal, mid, 16, 700, INK, "center");
    } else {
      text("غير متوفر", colTotal + 40, mid, 14, 700, "#A0A0A0", "center");
    }
    if (!dry) {
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(left, y + rowH); ctx.lineTo(right, y + rowH); ctx.stroke();
    }
    y += rowH;
  });
  y += 24;

  // ---------- الإجماليات ----------
  const totalRow = (label: string, value: string) => {
    text(label, right - 6, y, 17, 400, MUTED);
    text(`${value} ج.م`, left + 6, y, 18, 700, INK, "left");
    y += 34;
  };
  y += 6;
  totalRow("إجمالي الأصناف", formatMoney(d.itemsTotal));
  totalRow("رسوم التوصيل", formatMoney(d.deliveryFee));
  y += 4;

  const boxH = 74;
  if (!dry) {
    const g = ctx.createLinearGradient(left, y, right, y + boxH);
    g.addColorStop(0, BRAND);
    g.addColorStop(1, BRAND_DARK);
    roundRect(ctx, left, y, contentW, boxH, 18);
    ctx.fillStyle = g;
    ctx.fill();
  }
  text("الإجمالي المطلوب", right - 24, y + 45, 20, 700, "#FFFFFF");
  text(`${formatMoney(d.grandTotal)} ج.م`, left + 24, y + 48, 30, 800, "#FFFFFF", "left");
  y += boxH + 30;

  // ---------- ختم "تم الاستلام" + الفوتر ----------
  if (!dry) {
    ctx.strokeStyle = OK;
    ctx.lineWidth = 2;
    roundRect(ctx, right - 150, y, 150, 38, 19);
    ctx.stroke();
  }
  text("✓ تم التسليم", right - 75, y + 25, 16, 700, OK, "center");
  y += 38 + 34;

  const footerLines = wrapText(d.footerText, contentW, measure(15, 400));
  for (const fl of footerLines) {
    text(fl, W / 2, y, 15, 400, MUTED, "center");
    y += 24;
  }
  y += 22;
  return y;
}

export async function renderInvoiceToBlob(data: InvoiceData): Promise<Blob> {
  const family = fontFamily();

  // لازم الخط يكون اتحمّل قبل ما نقيس أو نرسم، وإلا هيتقاس بخط بديل
  try {
    await Promise.all([
      document.fonts.load(`400 16px ${family}`, "اختبار"),
      document.fonts.load(`700 16px ${family}`, "اختبار"),
      document.fonts.load(`800 16px ${family}`, "اختبار")
    ]);
    await document.fonts.ready;
  } catch {}

  const probe = document.createElement("canvas");
  probe.width = W;
  probe.height = 10;
  const height = Math.ceil(draw(probe.getContext("2d")!, data, family, true));

  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, height);
  draw(ctx, data, family, false);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("تعذّر إنشاء صورة الفاتورة"))), "image/jpeg", 0.92);
  });
}
