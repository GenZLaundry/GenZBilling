import QRCode from 'qrcode';
import { getUPIConfig } from './upiConfig';

export interface ShareableBillData {
  billNumber: string;
  customerName: string;
  customerPhone?: string;
  items: Array<{ name: string; quantity: number; rate: number; amount: number }>;
  previousBills?: Array<{
    billNumber: string;
    items: Array<{ name: string; quantity: number; rate: number; amount: number }>;
    total: number;
  }>;
  subtotal: number;
  discount?: number;
  deliveryCharge?: number;
  previousBalance?: number;
  grandTotal: number;
  businessName: string;
  businessPhone: string;
  businessAddress?: string;
  billDate?: string;
  amountPaid?: number;
  amountDue?: number;
  paymentStatus?: 'paid' | 'unpaid' | 'partial';
  paymentHistory?: Array<{ amount: number; date: string; note: string }>;
  thankYouMessage?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  return d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtTime() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ─── Canvas receipt renderer ──────────────────────────────────────────────────
// Pure canvas — no popups, no SVG foreignObject, no external fetches.
// QR generated locally via qrcode lib and drawn directly onto canvas.

const SCALE  = 3;          // 3× for crisp high-DPI output
const W      = 380;        // receipt width in logical px
const SIDE   = 18;         // left/right padding
const BLACK  = '#000000';
const WHITE  = '#ffffff';

function font(size: number, weight: 'normal' | 'semibold' | 'bold' | 'extra-bold' | 'black-bold' = 'semibold') {
  let w = '600';
  if (weight === 'normal') w = '500';
  else if (weight === 'semibold') w = '600';
  else if (weight === 'bold') w = '700';
  else if (weight === 'extra-bold') w = '800';
  else if (weight === 'black-bold') w = '900';
  return `${w} ${size}px Arial, Helvetica, "Liberation Sans", sans-serif`;
}

// Measure canvas height by doing a dry-run draw
async function measureHeight(d: ShareableBillData, qrImg: HTMLImageElement | null, logoImg: HTMLImageElement | null): Promise<number> {
  const c = document.createElement('canvas');
  c.width = 1; c.height = 1;
  const ctx = c.getContext('2d')!;
  return drawReceipt(ctx, d, qrImg, logoImg, true);
}

// Draw the full receipt. Returns the final Y position (= total height).
// If `measure` is true, skips all actual drawing (just tracks Y).
async function drawReceipt(
  ctx: CanvasRenderingContext2D,
  d: ShareableBillData,
  qrImg: HTMLImageElement | null,
  logoImg: HTMLImageElement | null,
  measure: boolean
): Promise<number> {
  const w = W;
  const pad = SIDE;
  let y = 16;

  // Draw horizontal line
  const hline = (yy: number, lw = 2, dash: number[] = []) => {
    if (measure) return;
    ctx.save();
    ctx.strokeStyle = BLACK;
    ctx.lineWidth = lw;
    ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(pad, yy); ctx.lineTo(w - pad, yy); ctx.stroke();
    ctx.restore();
  };

  // Draw double horizontal line
  const doubleHline = (yy: number, lw = 1.2) => {
    if (measure) return;
    ctx.save();
    ctx.strokeStyle = BLACK;
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(pad, yy); ctx.lineTo(w - pad, yy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad, yy + 3); ctx.lineTo(w - pad, yy + 3); ctx.stroke();
    ctx.restore();
  };

  // Draw rounded card frame
  const drawCardFrame = (yy: number, h: number, r = 6) => {
    if (measure) return;
    ctx.save();
    ctx.strokeStyle = BLACK;
    ctx.lineWidth = 1.2;
    const x = pad;
    const width = w - pad * 2;
    ctx.beginPath();
    ctx.moveTo(x + r, yy);
    ctx.lineTo(x + width - r, yy);
    ctx.quadraticCurveTo(x + width, yy, x + width, yy + r);
    ctx.lineTo(x + width, yy + h - r);
    ctx.quadraticCurveTo(x + width, yy + h, x + width - r, yy + h);
    ctx.lineTo(x + r, yy + h);
    ctx.quadraticCurveTo(x, yy + h, x, yy + h - r);
    ctx.lineTo(x, yy + r);
    ctx.quadraticCurveTo(x, yy, x + r, yy);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  };

  // Draw centered text, returns new Y
  const ctext = (text: string, yy: number, size: number, weight: 'normal' | 'semibold' | 'bold' | 'extra-bold' | 'black-bold' = 'bold', letterSpacing = 0): number => {
    if (!measure) {
      ctx.font = font(size, weight);
      ctx.fillStyle = BLACK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      if (letterSpacing > 0 && ctx.letterSpacing !== undefined) {
        ctx.letterSpacing = `${letterSpacing}px`;
      }
      ctx.fillText(text, w / 2, yy);
      if (letterSpacing > 0 && ctx.letterSpacing !== undefined) {
        ctx.letterSpacing = '0px';
      }
    }
    return yy + size + 4;
  };

  // Draw left+right text on same line, returns new Y
  const lrtext = (left: string, right: string, yy: number, size: number, leftWeight: 'normal' | 'semibold' | 'bold' = 'bold', rightWeight: 'normal' | 'semibold' | 'bold' | 'extra-bold' = 'extra-bold'): number => {
    if (!measure) {
      ctx.fillStyle = BLACK;
      ctx.textBaseline = 'top';
      
      ctx.font = font(size, leftWeight);
      ctx.textAlign = 'left';
      ctx.fillText(left, pad + 6, yy);
      
      ctx.font = font(size, rightWeight);
      ctx.textAlign = 'right';
      ctx.fillText(right, w - pad - 6, yy);
    }
    return yy + size + 6;
  };

  // Draw 4-column item row with word-wrapping support
  const itemRow = (name: string, qty: string, price: string, total: string, yy: number, size: number, isHeader = false): number => {
    ctx.font = font(size, isHeader ? 'extra-bold' : 'bold');
    
    const maxNameWidth = 160; // Max width for item name column to prevent overlapping QTY column
    let displayLines = [name];
    
    if (!isHeader) {
      const words = name.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const testWidth = ctx.measureText(testLine).width;
        if (testWidth > maxNameWidth && i > 0) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
      displayLines = lines.length > 0 ? lines : [name];
    }

    if (!measure) {
      ctx.fillStyle = BLACK;
      ctx.textBaseline = 'top';
      
      // Draw each wrapped line of the item name
      displayLines.forEach((line, index) => {
        ctx.font = font(size, isHeader ? 'extra-bold' : 'bold');
        ctx.textAlign = 'left';
        ctx.fillText(line, pad + 6, yy + index * (size + 4));
      });
      
      // Draw Qty, Price, and Total aligned with the first line of the item row
      ctx.font = font(size, isHeader ? 'extra-bold' : 'bold');
      ctx.textAlign = 'center';
      ctx.fillText(qty, w * 0.55, yy);
      
      ctx.font = font(size, isHeader ? 'extra-bold' : 'bold');
      ctx.textAlign = 'right';
      ctx.fillText(price, w * 0.75, yy);
      
      ctx.font = font(size, isHeader ? 'extra-bold' : 'extra-bold');
      ctx.textAlign = 'right';
      ctx.fillText(total, w - pad - 6, yy);
    }
    
    const lineCount = displayLines.length;
    return yy + lineCount * size + (lineCount - 1) * 4 + 8;
  };

  // ── PREMIUM HEADER ──────────────────────────────────────────────────────────
  const address = d.businessAddress || 'Sabji Mandi Circle, Ratanada, Jodhpur';

  if (logoImg) {
    const logoWidth = 200;
    const logoScale = logoWidth / logoImg.width;
    const logoHeight = logoImg.height * logoScale;
    
    y += 8;
    if (!measure) {
      ctx.drawImage(logoImg, (w - logoWidth) / 2, y, logoWidth, logoHeight);
    }
    y += logoHeight + 10;
    y = ctext(address, y, 9.5, 'semibold');
    y = ctext(`PH: ${d.businessPhone}`, y, 9.5, 'semibold');
    y += 12;
  } else {
    const businessName = "GEN-Z";
    const businessSubtitle = "LAUNDRY & DRY CLEANERS";

    y += 8;
    y = ctext(businessName, y, 22, 'black-bold', 1.5);
    y += 2;
    y = ctext(businessSubtitle, y, 11, 'extra-bold', 0.5);
    y += 6;
    y = ctext(address, y, 9.5, 'semibold');
    y = ctext(`PH: ${d.businessPhone}`, y, 9.5, 'semibold');
    y += 12;
  }

  // ── BILL INFO SECTION ───────────────────────────────────────────────────────
  hline(y, 1.2);
  y += 8;
  if (d.customerName) {
    y = lrtext('CUSTOMER NAME:', d.customerName.toUpperCase(), y, 11, 'bold', 'extra-bold');
  }
  if (d.customerPhone) {
    y = lrtext('CUSTOMER PHONE:', d.customerPhone, y, 10, 'semibold', 'bold');
  }
  y = lrtext('BILL NUMBER:', d.billNumber, y, 10, 'bold', 'extra-bold');
  y = lrtext('DATE & TIME:', `${fmtDate(d.billDate)} • ${fmtTime()}`, y, 10, 'semibold', 'bold');
  y += 2;
  hline(y, 1.2);
  y += 16;

  // ── SECTION HEADER ────────────────────────────────────────────────────────
  hline(y, 1.2); y += 6;
  y = ctext('ORDER DETAILS', y, 11, 'extra-bold', 1.5); y += 2;
  hline(y, 1.2); y += 14;

  // ── CURRENT ITEMS ─────────────────────────────────────────────────────────
  if (d.items.length > 0) {
    const totalQty = d.items.reduce((s, i) => s + i.quantity, 0);
    y = ctext(`CURRENT ORDER — ${totalQty} ITEMS`, y, 10.5, 'extra-bold', 0.5);
    y += 6;
    hline(y, 1);
    y += 10;
    
    y = itemRow('ITEM', 'QTY', 'PRICE', 'TOTAL', y, 9.5, true);
    y += 2;
    hline(y, 1.2);
    y += 8;
    
    for (let i = 0; i < d.items.length; i++) {
      const item = d.items[i];
      const kgMatch = item.name.match(/^(.+?)\s*\((\d+\.?\d*)\s*kg\s*@\s*(?:₹|Rs\.?|Rs)?\s*(\d+\.?\d*)\/kg\)$/i);
      if (kgMatch) {
        y = itemRow(kgMatch[1], `${kgMatch[2]}kg`, `₹${kgMatch[3]}/kg`, `₹${item.amount}`, y, 9.5, false);
      } else {
        y = itemRow(item.name, `${item.quantity}`, `₹${item.rate}`, `₹${item.amount}`, y, 9.5, false);
      }
      if (i < d.items.length - 1) {
        y += 4;
        hline(y, 1, [1, 2]); // dotted line
        y += 8;
      }
    }
    y += 16;
  }

  // ── PREVIOUS BILLS ────────────────────────────────────────────────────────
  if (d.previousBills && d.previousBills.length > 0) {
    y = ctext(`PREVIOUS BILLS — ${d.previousBills.length} RECORD(S)`, y, 10.5, 'extra-bold', 0.5);
    y += 6;
    hline(y, 1);
    y += 12;
    
    for (const pb of d.previousBills) {
      let pbStartY = y;
      y += 10;
      if (!measure) {
        ctx.font = font(10.5, 'extra-bold');
        ctx.fillStyle = BLACK;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`BILL: ${pb.billNumber.toUpperCase()}`, pad + 6, y);
      }
      y += 16;
      y = itemRow('ITEM', 'QTY', 'PRICE', 'TOTAL', y, 9.5, true);
      y += 2;
      hline(y, 1.2);
      y += 8;
      
      for (let i = 0; i < pb.items.length; i++) {
        const item = pb.items[i];
        const kgMatch = item.name.match(/^(.+?)\s*\((\d+\.?\d*)\s*kg\s*@\s*(?:₹|Rs\.?|Rs)?\s*(\d+\.?\d*)\/kg\)$/i);
        if (kgMatch) {
          y = itemRow(kgMatch[1], `${kgMatch[2]}kg`, `₹${kgMatch[3]}/kg`, `₹${item.amount}`, y, 9.5, false);
        } else {
          y = itemRow(item.name, `${item.quantity}`, `₹${item.rate}`, `₹${item.amount}`, y, 9.5, false);
        }
        if (i < pb.items.length - 1) {
          y += 4;
          hline(y, 1, [1, 2]);
          y += 8;
        }
      }
      y += 8;
      hline(y, 1.2);
      y += 10;
      y = lrtext('PREVIOUS TOTAL:', `₹${pb.total}`, y, 10, 'bold', 'extra-bold');
      y += 8;
      hline(y, 1.2);
      y += 16;
    }
  }

  // ── TOTALS BOX ────────────────────────────────────────────────────────────
  const totRows: [string, string][] = [];
  if (d.previousBills && d.previousBills.length > 0)
    totRows.push(['PREVIOUS BILLS TOTAL:', `₹${d.previousBills.reduce((s, b) => s + b.total, 0)}`]);
  if (d.previousBalance && d.previousBalance > 0)
    totRows.push(['PREVIOUS DUE:', `₹${d.previousBalance}`]);
  if (d.items.length > 0)
    totRows.push(['CURRENT ORDER:', `₹${d.items.reduce((s, i) => s + i.amount, 0)}`]);
  totRows.push(['SUBTOTAL:', `₹${d.subtotal}`]);
  if (d.discount && d.discount > 0)          totRows.push(['DISCOUNT:', `-₹${d.discount}`]);
  if (d.deliveryCharge && d.deliveryCharge > 0) totRows.push(['DELIVERY:', `+₹${d.deliveryCharge}`]);
  
  let totalsStartY = y;
  hline(y, 1.2);
  y += 10;
  for (const [l, r] of totRows) { y = lrtext(l, r, y, 10, 'bold', 'extra-bold'); y += 4; }
  y += 6;
  hline(y, 1.2);
  y += 16;

  // ── GRAND TOTAL ───────────────────────────────────────────────────────────
  hline(y, 1.2); y += 12;
  y = ctext(`TOTAL: ₹${d.grandTotal}`, y, 15, 'black-bold', 1.5);
  y += 6;
  doubleHline(y, 1.2); y += 16;

  // ── PAYMENT DETAILS ───────────────────────────────────────────────────────
  const amountPaid = d.amountPaid || 0;
  const amountDue  = d.amountDue !== undefined && d.amountDue !== null ? Number(d.amountDue) : d.grandTotal - amountPaid;
  if (amountPaid > 0 || d.paymentStatus === 'partial' || d.paymentStatus === 'paid') {
    let detailsStartY = y;
    y += 10;
    y = ctext('PAYMENT DETAILS', y, 10, 'extra-bold', 1);
    y += 6; hline(y, 1.2); y += 10;
    
    y = lrtext('BILL TOTAL:', `₹${d.grandTotal}`, y, 9.5, 'semibold', 'extra-bold'); y += 2;
    y = lrtext('AMOUNT PAID:', `₹${amountPaid}`, y, 9.5, 'semibold', 'extra-bold'); y += 6;
    
    if (d.paymentHistory) {
      for (const p of d.paymentHistory) {
         if (!measure) {
           ctx.font = font(9, 'semibold'); ctx.fillStyle = BLACK;
           ctx.textAlign = 'left'; ctx.textBaseline = 'top'; 
           ctx.fillText(`• ${new Date(p.date).toLocaleDateString('en-IN')}${p.note ? ' (' + p.note + ')' : ''}`, pad + 12, y);
           ctx.textAlign = 'right'; 
           ctx.fillText(`₹${p.amount}`, w - pad - 12, y);
         }
         y += 16;
      }
      y += 6;
    }
    
    hline(y, 1, [2, 2]); y += 10;
    y = lrtext('BALANCE DUE:', `₹${amountDue}`, y, 11, 'bold', 'extra-bold');
    y += 10;
    drawCardFrame(detailsStartY, y - detailsStartY, 8);
    y += 16;
  }

  // ── QR / SCAN TO PAY ──────────────────────────────────────────────────────
  const upiConfig = getUPIConfig();
  const qrAmount = amountDue > 0 ? amountDue : amountPaid === 0 ? d.grandTotal : 0;
  if (qrAmount > 0 && qrImg) {
    const qrSize = 160;
    let payCardStartY = y;
    y += 12;
    y = ctext('SCAN TO PAY', y, 10.5, 'extra-bold', 1.5);
    y = ctext(`₹${qrAmount}${amountDue > 0 && amountPaid > 0 ? ' (Due)' : ''}`, y, 16, 'black-bold');
    y += 10;
    if (!measure) {
      ctx.lineWidth = 1.2; ctx.strokeStyle = BLACK;
      ctx.strokeRect((w - qrSize) / 2 - 2, y - 2, qrSize + 4, qrSize + 4);
      ctx.drawImage(qrImg, (w - qrSize) / 2, y, qrSize, qrSize);
    }
    y += qrSize + 12;
    y = ctext('PhonePe | GPay | Paytm | UPI', y, 9.5, 'extra-bold', 0.5);
    y += 4;
    y = ctext(`UPI: ${upiConfig.upiId || '6367493127@ybl'}`, y, 9, 'bold');
    y += 12;
    drawCardFrame(payCardStartY, y - payCardStartY, 8);
    y += 16;
  }

  // ── FOOTER ────────────────────────────────────────────────────────────────
  hline(y, 1.2); y += 12;
  y = ctext(d.thankYouMessage || 'Thank you for choosing Gen-Z Laundry!', y, 10.5, 'extra-bold');
  y += 6;
  y = ctext('Website: www.genzlaundry.com', y, 9.5, 'semibold');
  y += 4;
  y = ctext('Visit us again \u2022 Gen-Z Laundry & Dry Cleaners', y, 9.5, 'bold', 0.5);
  y += 24;

  return y;
}

async function generateBillJPEG(d: ShareableBillData): Promise<Blob> {
  const upiConfig = getUPIConfig();
  const amountPaid = d.amountPaid || 0;
  const amountDue  = d.amountDue !== undefined ? d.amountDue : d.grandTotal - amountPaid;
  const qrAmount   = amountDue > 0 ? amountDue : amountPaid === 0 ? d.grandTotal : 0;

  // Load logo image if printLogo is enabled in system prefs
  let logoImg: HTMLImageElement | null = null;
  let printLogo = true;
  try {
    const savedPrefs = localStorage.getItem('genz_system_prefs');
    if (savedPrefs) {
      const prefs = JSON.parse(savedPrefs);
      if (prefs.printLogo !== undefined) {
        printLogo = prefs.printLogo;
      }
    }
  } catch (e) {
    console.warn('Failed to load printLogo preference:', e);
  }

  if (printLogo) {
    try {
      logoImg = await new Promise<HTMLImageElement>((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = '/bill_logo.jpg';
      });
    } catch (e) {
      console.warn('Failed to load bill logo /bill_logo.jpg, checking fallback /logo.png', e);
      try {
        logoImg = await new Promise<HTMLImageElement>((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = '/logo.png';
        });
      } catch (e2) {
        console.warn('All logo loads failed, falling back to text header', e2);
      }
    }
  }

  // Generate QR locally — no external fetch, no canvas taint
  let qrImg: HTMLImageElement | null = null;
  if (qrAmount > 0) {
    const upiId    = upiConfig.upiId || '6367493127@ybl';
    const payeeName = upiConfig.payeeName || 'GenZ Laundry';
    const upiUrl   = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${qrAmount}&cu=INR&tn=${encodeURIComponent('Bill ' + d.billNumber)}`;
    const dataUrl  = await QRCode.toDataURL(upiUrl, {
      width: 400, margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    });
    qrImg = await new Promise<HTMLImageElement>((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = dataUrl;
    });
  }

  // Measure height with a dry-run
  const dummy = document.createElement('canvas');
  dummy.width = W; dummy.height = 10;
  const mCtx = dummy.getContext('2d')!;
  const totalH = await drawReceipt(mCtx, d, qrImg, logoImg, true);

  // Render at SCALE× for crisp output
  const canvas = document.createElement('canvas');
  canvas.width  = W * SCALE;
  canvas.height = (totalH + 20) * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, W, totalH + 20);
  await drawReceipt(ctx, d, qrImg, logoImg, false);

  return new Promise((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg', 0.95);
  });
}

// ─── BillShareService ─────────────────────────────────────────────────────────

export class BillShareService {

  static generateBillText(d: ShareableBillData): string {
    let t = `*${d.businessName}*\n📞 ${d.businessPhone}\n`;
    if (d.businessAddress) t += `📍 ${d.businessAddress}\n`;
    t += `━━━━━━━━━━━━━━━━━━━━\n🧾 *Bill #${d.billNumber}*\n`;
    t += `📅 ${fmtDate(d.billDate)}  🕐 ${fmtTime()}\n👤 ${d.customerName}\n`;
    if (d.customerPhone) t += `📱 ${d.customerPhone}\n`;
    t += `\n━━━━━━━━━━━━━━━━━━━━\n*ORDER DETAILS*\n━━━━━━━━━━━━━━━━━━━━\n`;
    if (d.items.length > 0) {
      t += `\n🛍️ *CURRENT ORDER*\n`;
      d.items.forEach((item, i) => {
        const kg = item.name.match(/^(.+?)\s*\((\d+\.?\d*)\s*kg\s*@\s*₹(\d+\.?\d*)\/kg\)$/);
        if (kg) t += `${i + 1}. ${kg[1]}\n   ${kg[2]}kg × ₹${kg[3]}/kg = ₹${item.amount}\n`;
        else    t += `${i + 1}. ${item.name}\n   ${item.quantity} × ₹${item.rate} = ₹${item.amount}\n`;
      });
    }
    if (d.previousBills && d.previousBills.length > 0) {
      t += `\n📋 *PREVIOUS BILLS*\n`;
      d.previousBills.forEach(pb => {
        t += `\nBill ${pb.billNumber}:\n`;
        pb.items.forEach(item => { t += `  • ${item.name} × ${item.quantity} = ₹${item.amount}\n`; });
        t += `  Total: ₹${pb.total}\n`;
      });
    }
    t += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    if (d.previousBills && d.previousBills.length > 0)
      t += `Previous Bills: ₹${d.previousBills.reduce((s, b) => s + b.total, 0)}\n`;
    if (d.previousBalance && d.previousBalance > 0) t += `Previous Due: ₹${d.previousBalance}\n`;
    if (d.items.length > 0) t += `Current Order: ₹${d.items.reduce((s, i) => s + i.amount, 0)}\n`;
    t += `Subtotal: ₹${d.subtotal}\n`;
    if (d.discount && d.discount > 0) t += `Discount: -₹${d.discount}\n`;
    if (d.deliveryCharge && d.deliveryCharge > 0) t += `Delivery: +₹${d.deliveryCharge}\n`;
    t += `━━━━━━━━━━━━━━━━━━━━\n*TOTAL: ₹${d.grandTotal}*\n━━━━━━━━━━━━━━━━━━━━\n`;
    const paid = d.amountPaid || 0;
    if (paid > 0) {
      const due = d.amountDue ?? (d.grandTotal - paid);
      t += `\n💳 *PAYMENT*\nPaid: ₹${paid}\n`;
      t += due <= 0 ? `✅ FULLY PAID\n` : `Balance Due: ₹${due}\n`;
    }
    t += `\n${d.thankYouMessage || 'Thank you for choosing Gen-Z Laundry!'} 🙏`;
    return t;
  }

  /** Generate crisp JPEG receipt image — pure canvas, no popups, no external fetches */
  static async generateBillImageBlob(billData: ShareableBillData): Promise<Blob> {
    return generateBillJPEG(billData);
  }

  /** WhatsApp: image on mobile (native share), download image + copy text on desktop without new tab */
  static async shareOnWhatsApp(billData: ShareableBillData, phoneNumber?: string) {
    try {
      const blob = await this.generateBillImageBlob(billData);
      const file = new File([blob], `Bill_${billData.billNumber}.jpg`, { type: 'image/jpeg' });

      // Mobile: native share sheet with image file — picks WhatsApp directly
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Bill #${billData.billNumber}`,
          text: `Bill from ${billData.businessName}`,
        });
        return;
      }

      // Desktop: download the image
      const imgUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = imgUrl;
      a.download = `Bill_${billData.billNumber}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(imgUrl);

      // Copy message text to clipboard (and DO NOT open wa.me / window.open)
      const msg = this.generateBillText(billData);
      try {
        await navigator.clipboard.writeText(msg);
        alert('Bill JPEG image downloaded and message text copied to clipboard!');
      } catch (err) {
        alert('Bill JPEG image downloaded!');
      }

    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      // Fallback: copy text to clipboard
      const msg = this.generateBillText(billData);
      try {
        await navigator.clipboard.writeText(msg);
        alert('Bill text copied to clipboard!');
      } catch (err) {
        alert('Failed to share bill.');
      }
    }
  }

  /** Share via OS share sheet — image on mobile (all apps), download on desktop */
  static async shareViaSystem(billData: ShareableBillData) {
    try {
      const blob = await this.generateBillImageBlob(billData);
      const file = new File([blob], `Bill_${billData.billNumber}.jpg`, { type: 'image/jpeg' });

      // Mobile: native share sheet with image — shows ALL apps (WhatsApp, Telegram, Gmail, etc.)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Bill #${billData.billNumber}`,
          text: `Bill from ${billData.businessName} — Total: ₹${billData.grandTotal}`,
        });
        return true;
      }

      // Desktop: download the image
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bill_${billData.billNumber}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Copy text to clipboard
      const msg = this.generateBillText(billData);
      try {
        await navigator.clipboard.writeText(msg);
        alert('Bill JPEG image downloaded and text copied to clipboard!');
      } catch (err) {
        alert('Bill JPEG image downloaded!');
      }
      return true;
    } catch (e: any) {
      if (e?.name === 'AbortError') return false;
      try {
        await navigator.clipboard.writeText(this.generateBillText(billData));
        alert('Bill copied to clipboard!');
        return true;
      } catch {}
    }
    return false;
  }

  static async generateBillQRCode(billData: ShareableBillData): Promise<string> {
    let text = `${billData.businessName}\nBill: ${billData.billNumber}\nDate: ${fmtDate(billData.billDate)}\nCustomer: ${billData.customerName}\n---\n`;
    billData.items.forEach(i => { text += `${i.name} x${i.quantity} = ₹${i.amount}\n`; });
    text += `---\nTOTAL: ₹${billData.grandTotal}`;
    return await QRCode.toDataURL(text, { width: 400, margin: 2, color: { dark: '#000000', light: '#FFFFFF' }, errorCorrectionLevel: 'M' });
  }

  static generateBillURL(billData: ShareableBillData): string {
    const info = { bn: billData.billNumber, cn: billData.customerName, t: billData.grandTotal, d: billData.billDate || new Date().toISOString().split('T')[0] };
    return `${window.location.origin}/bill/${btoa(JSON.stringify(info))}`;
  }

  static async downloadBillAsImage(billData: ShareableBillData) {
    try {
      const blob = await this.generateBillImageBlob(billData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `Bill_${billData.billNumber}.jpg`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download bill image');
    }
  }
}
