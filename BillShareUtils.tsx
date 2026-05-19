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
const MONO   = '700 {SIZE}px "Courier New", Courier, monospace';

function font(size: number, bold = true) {
  return `${bold ? '900' : '700'} ${size}px "Courier New", Courier, monospace`;
}

// Measure canvas height by doing a dry-run draw
async function measureHeight(d: ShareableBillData, qrImg: HTMLImageElement | null): Promise<number> {
  const c = document.createElement('canvas');
  c.width = 1; c.height = 1;
  const ctx = c.getContext('2d')!;
  return drawReceipt(ctx, d, qrImg, true);
}

// Draw the full receipt. Returns the final Y position (= total height).
// If `measure` is true, skips all actual drawing (just tracks Y).
// Draw the full receipt. Returns the final Y position (= total height).
// If `measure` is true, skips all actual drawing (just tracks Y).
// Draw the full receipt. Returns the final Y position (= total height).
// If `measure` is true, skips all actual drawing (just tracks Y).
async function drawReceipt(
  ctx: CanvasRenderingContext2D,
  d: ShareableBillData,
  qrImg: HTMLImageElement | null,
  measure: boolean
): Promise<number> {
  const w = W;
  const pad = SIDE;
  let y = 16;

  const fill = (color: string) => { if (!measure) ctx.fillStyle = color; };
  const stroke = (color: string, lw: number) => { if (!measure) { ctx.strokeStyle = color; ctx.lineWidth = lw; } };

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

  // Draw rectangle border
  const box = (yy: number, h: number, lw = 2) => {
    if (measure) return;
    ctx.save();
    ctx.strokeStyle = BLACK; ctx.lineWidth = lw;
    ctx.strokeRect(pad, yy, w - pad * 2, h);
    ctx.restore();
  };

  // Draw centered text, returns new Y
  const ctext = (text: string, yy: number, size: number, bold = true, letterSpacing = 0): number => {
    if (!measure) {
      ctx.font = font(size, bold);
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
  const lrtext = (left: string, right: string, yy: number, size: number, bold = true): number => {
    if (!measure) {
      ctx.font = font(size, bold);
      ctx.fillStyle = BLACK;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(left,  pad + 6, yy);
      ctx.textAlign = 'right';
      ctx.fillText(right, w - pad - 6, yy);
    }
    return yy + size + 6;
  };

  // Draw 4-column item row
  const itemRow = (name: string, qty: string, price: string, total: string, yy: number, size: number, bold = true): number => {
    if (!measure) {
      ctx.font = font(size, bold);
      ctx.fillStyle = BLACK;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const maxNameLen = 18;
      const displayStr = name.length > maxNameLen ? name.substring(0, maxNameLen-1) + '…' : name;
      ctx.fillText(displayStr,  pad + 6,       yy);
      ctx.textAlign = 'center'; ctx.fillText(qty,   w * 0.55,      yy);
      ctx.textAlign = 'right';  ctx.fillText(price, w * 0.75,      yy);
      ctx.textAlign = 'right';  ctx.fillText(total, w - pad - 6,   yy);
    }
    return yy + size + 8;
  };

  // ── PROFESSIONAL HEADER ─────────────────────────────────────────────────────
  const businessName = "GEN-Z";
  const businessSubtitle = "LAUNDRY & DRY CLEANERS";
  const address = d.businessAddress || 'Sabji Mandi Circle, Ratanada, Jodhpur';
  const phone = `📞 ${d.businessPhone}`;

  let boxY = y;
  y += 16;
  y = ctext(businessName, y, 32, true, 2);
  y += 8;
  y = ctext(businessSubtitle, y, 14, true, 1);
  y += 12;
  y = ctext(address, y, 11, true);
  y += 4;
  y = ctext(phone, y, 11, true);
  y += 12;
  box(boxY, y - boxY, 2);
  y += 16;

  // ── BILL INFO BOX ─────────────────────────────────────────────────────────
  const infoRows: [string, string][] = [];
  if (d.customerName)  infoRows.push(['Customer Name:', d.customerName]);
  infoRows.push(['Bill No:', d.billNumber]);
  infoRows.push(['Date:', fmtDate(d.billDate)]);
  infoRows.push(['Time:', fmtTime()]);
  
  boxY = y;
  y += 12;
  for (let i = 0; i < infoRows.length; i++) {
    y = lrtext(infoRows[i][0], infoRows[i][1], y, 12, true);
    if (i < infoRows.length - 1) {
      y += 4;
      hline(y, 1, [2, 2]);
      y += 8;
    }
  }
  y += 8;
  box(boxY, y - boxY, 2);
  y += 16;

  // ── SECTION HEADER ────────────────────────────────────────────────────────
  hline(y, 2); y += 8;
  y = ctext('ORDER DETAILS', y, 14, true, 1); y += 4;
  hline(y, 2); y += 16;

  // ── CURRENT ITEMS ─────────────────────────────────────────────────────────
  if (d.items.length > 0) {
    const totalQty = d.items.reduce((s, i) => s + i.quantity, 0);
    boxY = y;
    y += 8;
    y = ctext(`\uD83D\uDED2 CURRENT ORDER (${totalQty} item${totalQty !== 1 ? 's' : ''})`, y, 11, true);
    y += 4;
    box(boxY, y - boxY, 1);
    y += 16;
    
    y = itemRow('ITEM', 'QTY', 'PRICE', 'TOTAL', y, 11, true);
    y += 4;
    hline(y, 2); y += 8;
    
    for (let i = 0; i < d.items.length; i++) {
      const item = d.items[i];
      const kg = item.name.match(/^(.+?)\s*\((\d+\.?\d*)\s*kg\s*@\s*\u20B9(\d+\.?\d*)\/kg\)$/);
      if (kg) y = itemRow(kg[1], `${kg[2]}kg`, `\u20B9${kg[3]}/kg`, `\u20B9${item.amount}`, y, 11, true);
      else    y = itemRow(item.name, `${item.quantity}`, `\u20B9${item.rate}`, `\u20B9${item.amount}`, y, 11, true);
      if (i < d.items.length - 1) {
        y += 4;
        hline(y, 1, [2, 2]);
        y += 8;
      }
    }
    y += 16;
  }

  // ── PREVIOUS BILLS ────────────────────────────────────────────────────────
  if (d.previousBills && d.previousBills.length > 0) {
    boxY = y;
    y += 8;
    y = ctext(`\uD83D\uDCCB PREVIOUS BILLS (${d.previousBills.length})`, y, 11, true);
    y += 4;
    box(boxY, y - boxY, 1);
    y += 16;
    
    for (const pb of d.previousBills) {
      const pbStartY = y;
      y += 12;
      if (!measure) {
        ctx.font = font(11, true); ctx.fillStyle = BLACK; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`Bill: ${pb.billNumber}`, pad + 6, y);
      }
      y += 18;
      y = itemRow('ITEM', 'QTY', 'PRICE', 'TOTAL', y, 11, true);
      y += 4; hline(y, 2); y += 8;
      
      for (let i = 0; i < pb.items.length; i++) {
        const item = pb.items[i];
        y = itemRow(item.name, `${item.quantity}`, `\u20B9${item.rate}`, `\u20B9${item.amount}`, y, 11, true);
        if (i < pb.items.length - 1) {
          y += 4; hline(y, 1, [2, 2]); y += 8;
        }
      }
      y += 8; hline(y, 2); y += 12;
      y = lrtext('Previous Bill Total:', `\u20B9${pb.total}`, y, 12, true);
      y += 8;
      box(pbStartY, y - pbStartY, 1);
      y += 16;
    }
  }

  // ── TOTALS BOX ────────────────────────────────────────────────────────────
  const totRows: [string, string][] = [];
  if (d.previousBills && d.previousBills.length > 0)
    totRows.push(['Previous Bills Total:', `\u20B9${d.previousBills.reduce((s, b) => s + b.total, 0)}`]);
  if (d.previousBalance && d.previousBalance > 0)
    totRows.push(['Previous Due:', `\u20B9${d.previousBalance}`]);
  if (d.items.length > 0)
    totRows.push(['Current Order:', `\u20B9${d.items.reduce((s, i) => s + i.amount, 0)}`]);
  totRows.push(['Subtotal:', `\u20B9${d.subtotal}`]);
  if (d.discount && d.discount > 0)          totRows.push(['Discount:', `-\u20B9${d.discount}`]);
  if (d.deliveryCharge && d.deliveryCharge > 0) totRows.push(['Delivery:', `+\u20B9${d.deliveryCharge}`]);
  
  boxY = y;
  y += 12;
  for (const [l, r] of totRows) { y = lrtext(l, r, y, 12, true); y += 4; }
  y += 8;
  box(boxY, y - boxY, 2);
  y += 16;

  // ── GRAND TOTAL ───────────────────────────────────────────────────────────
  hline(y, 3); y += 12;
  y = ctext(`TOTAL: \u20B9${d.grandTotal}`, y, 24, true, 1);
  y += 8;
  hline(y, 3); y += 16;

  // ── PAYMENT DETAILS ───────────────────────────────────────────────────────
  const amountPaid = d.amountPaid || 0;
  const amountDue  = d.amountDue !== undefined && d.amountDue !== null ? Number(d.amountDue) : d.grandTotal - amountPaid;
  if (amountPaid > 0 || d.paymentStatus === 'partial' || d.paymentStatus === 'paid') {
    boxY = y;
    y += 12;
    y = ctext('PAYMENT DETAILS', y, 13, true);
    y += 6; hline(y, 1, [4, 4]); y += 12;
    
    y = lrtext('Bill Total:', `\u20B9${d.grandTotal}`, y, 13, true); y += 4;
    y = lrtext('Amount Paid:', `\u20B9${amountPaid}`, y, 13, true); y += 8;
    
    if (d.paymentHistory) {
      for (const p of d.paymentHistory) {
         if (!measure) {
           ctx.font = font(10, true); ctx.fillStyle = BLACK;
           ctx.textAlign = 'left'; ctx.textBaseline = 'top'; 
           ctx.fillText(`${new Date(p.date).toLocaleDateString('en-IN')}${p.note ? ' (' + p.note + ')' : ''}`, pad + 16, y);
           ctx.textAlign = 'right'; 
           ctx.fillText(`\u20B9${p.amount}`, w - pad - 6, y);
         }
         y += 18;
      }
      y += 8;
    }
    
    hline(y, 2); y += 12;
    y = lrtext('BALANCE DUE:', `\u20B9${amountDue}`, y, 16, true);
    y += 12;
    box(boxY, y - boxY, 2);
    y += 16;
  }

  // ── QR / FULLY PAID ───────────────────────────────────────────────────────
  const qrAmount = amountDue > 0 ? amountDue : amountPaid === 0 ? d.grandTotal : 0;
  const upiConfig = getUPIConfig();
  if (qrAmount > 0 && qrImg) {
    const qrSize = 180;
    boxY = y;
    y += 24;
    y = ctext('SCAN TO PAY', y, 16, true);
    y = ctext(`\u20B9${qrAmount}${amountDue > 0 && amountPaid > 0 ? ' (Due)' : ''}`, y, 22, true);
    y += 12;
    if (!measure) {
      ctx.lineWidth = 2; ctx.strokeStyle = BLACK;
      ctx.strokeRect((w - qrSize) / 2 - 2, y - 2, qrSize + 4, qrSize + 4);
      ctx.drawImage(qrImg, (w - qrSize) / 2, y, qrSize, qrSize);
    }
    y += qrSize + 20;
    y = ctext('PhonePe | GPay | Paytm | UPI', y, 12, true);
    y += 4;
    y = ctext(`UPI: ${upiConfig.upiId || '6367493127@ybl'}`, y, 10, true);
    y += 16;
    box(boxY, y - boxY, 3);
    y += 16;
  }

  // ── FOOTER ────────────────────────────────────────────────────────────────
  hline(y, 2); y += 16;
  y = ctext(d.thankYouMessage || 'Thank you for choosing Gen-Z Laundry!', y, 12, true);
  y += 6;
  y = ctext('Website: www.genzlaundry.com', y, 10, true);
  y += 4;
  y = ctext('Visit us again \u2022 Gen-Z Laundry & Dry Cleaners', y, 10, true);
  y += 24;

  return y;
}

async function generateBillPNG(d: ShareableBillData): Promise<Blob> {
  const upiConfig = getUPIConfig();
  const amountPaid = d.amountPaid || 0;
  const amountDue  = d.amountDue !== undefined ? d.amountDue : d.grandTotal - amountPaid;
  const qrAmount   = amountDue > 0 ? amountDue : amountPaid === 0 ? d.grandTotal : 0;

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
  const totalH = await drawReceipt(mCtx, d, qrImg, true);

  // Render at SCALE× for crisp output
  const canvas = document.createElement('canvas');
  canvas.width  = W * SCALE;
  canvas.height = (totalH + 20) * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, W, totalH + 20);
  await drawReceipt(ctx, d, qrImg, false);

  return new Promise((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
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

  /** Generate crisp PNG receipt image — pure canvas, no popups, no external fetches */
  static async generateBillImageBlob(billData: ShareableBillData): Promise<Blob> {
    return generateBillPNG(billData);
  }

  /** WhatsApp: image on mobile (native share), download image + open WhatsApp on desktop */
  static async shareOnWhatsApp(billData: ShareableBillData, phoneNumber?: string) {
    const buildWaUrl = (msg: string) => {
      let url = 'https://wa.me/';
      if (phoneNumber) {
        const clean = phoneNumber.replace(/\D/g, '');
        url += `${clean.startsWith('91') ? clean : '91' + clean}?text=${encodeURIComponent(msg)}`;
      } else {
        url += `?text=${encodeURIComponent(msg)}`;
      }
      return url;
    };

    try {
      const blob = await this.generateBillImageBlob(billData);
      const file = new File([blob], `Bill_${billData.billNumber}.png`, { type: 'image/png' });

      // Mobile: native share sheet with image file — picks WhatsApp directly
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Bill #${billData.billNumber}`,
          text: `Bill from ${billData.businessName}`,
        });
        return;
      }

      // Desktop: download the image, then open WhatsApp with a short message
      const imgUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = imgUrl;
      a.download = `Bill_${billData.billNumber}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(imgUrl);

      // Open WhatsApp after a short delay so download starts first
      const msg = `Bill #${billData.billNumber} — ₹${billData.grandTotal}\nCustomer: ${billData.customerName}\n\n📎 Bill image downloaded. Please attach it to this chat.`;
      setTimeout(() => {
        const win = window.open('', '_blank');
        if (win) win.location.href = buildWaUrl(msg);
      }, 800);

    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      // Fallback: just open WhatsApp with text
      const win = window.open('', '_blank');
      const msg = this.generateBillText(billData);
      if (win) win.location.href = buildWaUrl(msg);
    }
  }

  /** Share via OS share sheet — image on mobile (all apps), download on desktop */
  static async shareViaSystem(billData: ShareableBillData) {
    try {
      const blob = await this.generateBillImageBlob(billData);
      const file = new File([blob], `Bill_${billData.billNumber}.png`, { type: 'image/png' });

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
      a.download = `Bill_${billData.billNumber}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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
      a.href = url; a.download = `Bill_${billData.billNumber}.png`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download bill image');
    }
  }
}
