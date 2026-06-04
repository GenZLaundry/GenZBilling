import fs from 'fs';

const filePath = 'd:/Dragon/DRAGON/Downloads/GenZBilling-main (1)/GenZBilling-main/public/sticker.png';

try {
  const buffer = fs.readFileSync(filePath);
  // PNG signature check
  if (buffer.readUInt32BE(0) !== 0x89504E47 || buffer.readUInt32BE(4) !== 0x0D0A1A0A) {
    console.log('Not a valid PNG file');
    process.exit(1);
  }
  
  // Find IHDR chunk
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    if (type === 'IHDR') {
      const width = buffer.readUInt32BE(offset + 8);
      const height = buffer.readUInt32BE(offset + 12);
      const bitDepth = buffer[offset + 20];
      const colorType = buffer[offset + 21];
      console.log(`PNG IHDR info: Width=${width}, Height=${height}, BitDepth=${bitDepth}, ColorType=${colorType}`);
      
      if (colorType === 4 || colorType === 6) {
        console.log('Image has an ALPHA channel (transparency).');
      } else {
        console.log('Image does NOT have an alpha channel color type.');
      }
      break;
    }
    offset += 12 + length;
  }
  
  // Check for tRNS chunk (transparency in non-alpha images)
  offset = 8;
  let hasTRNS = false;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    if (type === 'tRNS') {
      hasTRNS = true;
      break;
    }
    offset += 12 + length;
  }
  if (hasTRNS) {
    console.log('Image has a tRNS chunk (palette transparency).');
  }
} catch (err) {
  console.error('Error reading file:', err);
}
