/**
 * TSPL Tag Printer for TSC TL240
 * Sends raw TSPL commands directly to the printer via Windows print spooler
 * No browser, no HTML — pure label commands
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Roll width in dots
// Roll: 37mm wide, starts 43mm from left edge of 120mm print rod
const ROLL_WIDTH_MM  = 37;
const TAG_HEIGHT_MM  = 40; // Restored to 40mm to prevent calibration and cutoff issues
const DPI            = 203;

function mmToDots(mm) {
  return Math.round(mm * DPI / 25.4);
}

const W = mmToDots(ROLL_WIDTH_MM);  // ~296 dots
const H = mmToDots(TAG_HEIGHT_MM);  // ~320 dots

// Exact offset: roll starts 43mm from left = 344 dots
const ROLL_OFFSET_DOTS = mmToDots(43); // 344 dots

/**
 * Build TSPL command string for one tag
 */
function buildTagTSPL(tag, shiftDots = 0) {
  const lines = [];

  // SIZE = actual roll width. The printer's media guides physically position
  // the roll under the printhead — no software offset needed.
  // shiftDots is a user fine-tune adjustment if still slightly off.
  lines.push(`SIZE ${ROLL_WIDTH_MM} mm, ${TAG_HEIGHT_MM} mm`);
  lines.push(`GAP 0 mm, 0 mm`);
  lines.push(`DIRECTION 0`);
  lines.push(`REFERENCE ${shiftDots},0`);
  lines.push(`OFFSET 0 mm`);
  lines.push(`SET PEEL OFF`);
  lines.push(`SET CUTTER OFF`);
  lines.push(`CLS`);

  // ── Content ─────────────────────────────────────────────────────────────
  // TSPL TEXT: TEXT x,y,"font",rotation,x-mul,y-mul,alignment,"text"
  // Built-in fonts: 1=8x12  2=12x20  3=16x24  4=24x32  5=32x48
  // Alignment: 0=left, 1=center, 2=right
  // W = 296 dots (37mm), H = 320 dots (40mm)

  const CX = Math.round(W / 2);  // center = 148

  // ═══ TOP BORDER ═══
  lines.push(`BAR 0,0,${W},3`);

  // ═══ BRAND NAME ═══ split into 2 lines for max size
  // Font "4" = 24x32 per char. "GEN-Z" = 5×24=120, fits. "LAUNDRY" = 7×24=168, fits.
  lines.push(`TEXT ${CX},12,"4",0,1,1,1,"GEN-Z"`);
  lines.push(`TEXT ${CX},46,"4",0,1,1,1,"LAUNDRY"`);

  // Subtitle — font "2" (12x20)
  lines.push(`TEXT ${CX},80,"2",0,1,1,1,"& DRY CLEANERS"`);

  // ═══ DIVIDER ═══
  lines.push(`BAR 0,106,${W},2`);

  // ═══ DATE ═══ font "3" (16x24) — clearly readable
  lines.push(`TEXT ${CX},114,"3",0,1,1,1,"${tag.date}"`);

  // ═══ DIVIDER ═══
  lines.push(`BAR 0,144,${W},1`);

  // ═══ CUSTOMER NAME ═══
  const custName = (tag.customerName || '').toUpperCase().substring(0, 24);
  if (custName.length <= 8) {
    // Short name: font "4" (24x32) — e.g. "MANU" = 4×24=96 fits
    lines.push(`TEXT ${CX},152,"4",0,1,1,1,"${custName}"`);
  } else if (custName.length <= 15) {
    // Medium name: font "3" (16x24) — e.g. "BHAWANI SABJI" = 13×16=208 fits
    lines.push(`TEXT ${CX},152,"3",0,1,1,1,"${custName}"`);
  } else {
    // Long name: font "2" (12x20) — e.g. "SATYENDRA PRASAD GUPTA" = 22×12=264 fits
    lines.push(`TEXT ${CX},152,"2",0,1,1,1,"${custName}"`);
  }

  // ═══ SERVICE TYPE ═══ font "3" (16x24) — clear bold uppercase
  const rawType = (tag.washType || '').toUpperCase().trim();
  let serviceLabel = rawType;
  if (rawType === 'WASH') serviceLabel = 'WASH ONLY';
  else if (rawType === 'IRON') serviceLabel = 'IRON ONLY';
  else if (rawType === 'WASH+IRON') serviceLabel = 'WASH + IRON';
  else if (rawType === 'DRY CLEAN') serviceLabel = 'DRY CLEAN';

  lines.push(`TEXT ${CX},190,"3",0,1,1,1,"${serviceLabel}"`);

  // ═══ DIVIDER ═══
  lines.push(`BAR 0,220,${W},2`);

  // ═══ BILL NUMBER (left) + TAG COUNT (right) ═══
  // Font "4" (24x32) for clear readability
  const tagStr = `${tag.tagIndex}/${tag.totalTags}`;
  lines.push(`TEXT 6,230,"4",0,1,1,0,"${tag.billNumber}"`);
  lines.push(`TEXT ${W - 6},230,"4",0,1,1,2,"${tagStr}"`);

  // ═══ DIVIDER ═══
  lines.push(`BAR 0,270,${W},1`);

  // ═══ WEBSITE ═══ font "2" (12x20) — fits nicely
  lines.push(`TEXT ${CX},284,"2",0,1,1,1,"www.genzlaundry.com"`);

  // ═══ BOTTOM BORDER ═══
  lines.push(`BAR 0,317,${W},3`);

  // Print 1 copy
  lines.push(`PRINT 1,1`);
  
  // Feed 160 dots (exactly 20mm = 2cm gap spacing) after printing
  lines.push(`FEED 160`);

  return lines.join('\r\n') + '\r\n';
}

/**
 * Print tags to TSC TL240 via Windows RAW port
 * printerName: exact Windows printer name e.g. "TSC TL240"
 */
async function printTagsTSPL(tags, printerName = 'TSC TL240', shiftDots = 0) {
  const results = [];

  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    const tspl = buildTagTSPL(tag, shiftDots);

    // Write TSPL to a temp file
    const tmpFile = path.join(os.tmpdir(), `genz_tag_${Date.now()}_${i}.prn`);
    fs.writeFileSync(tmpFile, tspl, 'binary');

    // Send to printer via Windows COPY command (raw port)
    await new Promise((resolve, reject) => {
      // Use COPY /B to send raw binary to printer
      const cmd = `COPY /B "${tmpFile}" "\\\\localhost\\${printerName}"`;
      exec(cmd, { shell: 'cmd.exe' }, (err, stdout, stderr) => {
        fs.unlink(tmpFile, () => {}); // cleanup
        if (err) {
          console.error(`Tag ${i+1} print error:`, err.message);
          results.push({ tag: i+1, success: false, error: err.message });
        } else {
          console.log(`✅ Tag ${i+1}/${tags.length} sent to ${printerName}`);
          results.push({ tag: i+1, success: true });
        }
        resolve();
      });
    });

    // Small delay between tags
    await new Promise(r => setTimeout(r, 300));
  }

  return results;
}

module.exports = { printTagsTSPL, buildTagTSPL };
