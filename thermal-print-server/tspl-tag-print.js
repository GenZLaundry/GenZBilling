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
const TAG_HEIGHT_MM  = 50;
const DPI            = 203;

function mmToDots(mm) {
  return Math.round(mm * DPI / 25.4);
}

const W = mmToDots(ROLL_WIDTH_MM);  // ~296 dots
const H = mmToDots(TAG_HEIGHT_MM);  // ~400 dots

// Exact offset: roll starts 43mm from left = 344 dots
const ROLL_OFFSET_DOTS = mmToDots(43); // 344 dots

/**
 * Build TSPL command string for one tag
 */
function buildTagTSPL(tag, shiftDots = 0) {
  const lines = [];

  // Total offset = physical roll position + user fine-tune
  const totalOffset = ROLL_OFFSET_DOTS + shiftDots;

  // Page setup — tell printer the full rod width so it knows the coordinate space
  lines.push(`SIZE 120 mm, ${TAG_HEIGHT_MM} mm`);
  lines.push(`GAP 0 mm, 0 mm`);
  lines.push(`DIRECTION 0`);
  lines.push(`REFERENCE ${totalOffset},0`);  // start printing at roll position
  lines.push(`OFFSET 0 mm`);
  lines.push(`SET PEEL OFF`);
  lines.push(`SET CUTTER OFF`);
  lines.push(`CLS`);

  // ── Content ──────────────────────────────────────────────────────────────

  // Top border line
  lines.push(`BAR 0,0,${W},2`);

  // Brand name — centered, bold
  const brandY = 8;
  lines.push(`TEXT ${Math.round(W/2)},${brandY},"3",0,1,1,1,"Gen-Z Laundry"`);

  // Subtitle
  lines.push(`TEXT ${Math.round(W/2)},${brandY + 28},"2",0,1,1,1,"& Dry Cleaners"`);

  // Divider
  lines.push(`BAR 0,${brandY + 50},${W},1`);

  // Date
  lines.push(`TEXT ${Math.round(W/2)},${brandY + 58},"2",0,1,1,1,"${tag.date}"`);

  // Customer name — fit on one line, use smaller font for long names
  const custName = (tag.customerName || '').toUpperCase().substring(0, 16);
  const custFont = custName.length > 10 ? '3' : '4';
  lines.push(`TEXT ${Math.round(W/2)},${brandY + 90},"${custFont}",0,1,1,1,"${custName}"`);

  // Divider
  lines.push(`BAR 0,${brandY + 130},${W},1`);

  // Bill number centered, tag counter on right
  const billY = brandY + 142;
  lines.push(`TEXT ${Math.round(W/2)},${billY},"2",0,1,1,1,"${tag.billNumber}  ${tag.tagIndex}/${tag.totalTags}"`);

  // Website
  lines.push(`BAR 0,${H - 22},${W},1`);
  lines.push(`TEXT ${Math.round(W/2)},${H - 18},"1",0,1,1,1,"www.genzlaundry.com"`);

  // Bottom border
  lines.push(`BAR 0,${H - 2},${W},2`);

  // Print 1 copy and feed
  lines.push(`PRINT 1,1`);

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
