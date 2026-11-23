import { PosterContent, PosterFormat, PosterModelId } from '../types/poster';

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function drawGisLogo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  acronym: string,
  primary: string,
  accent: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Roofline
  ctx.strokeStyle = primary;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(14, 35);
  ctx.lineTo(42, 12);
  ctx.lineTo(70, 35);
  ctx.stroke();

  // Chimney accent
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(55, 22);
  ctx.lineTo(55, 14);
  ctx.lineTo(63, 14);
  ctx.lineTo(63, 29);
  ctx.stroke();

  // 4 window panes
  ctx.fillStyle = primary;
  ctx.fillRect(33, 29, 8, 8);
  ctx.fillRect(43, 39, 8, 8);
  ctx.fillStyle = accent;
  ctx.fillRect(43, 29, 8, 8);
  ctx.fillRect(33, 39, 8, 8);

  // Baseline swoosh
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(10, 56);
  ctx.bezierCurveTo(50, 67, 130, 67, 198, 52);
  ctx.stroke();

  // Acronym
  ctx.fillStyle = primary;
  ctx.font = '800 40px "Bricolage Grotesque", sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(acronym, 82, 46);

  ctx.restore();
}

export async function exportPosterAsPng(
  content: PosterContent,
  model: PosterModelId,
  format: PosterFormat
): Promise<void> {
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const dimensions: Record<PosterFormat, { w: number; h: number }> = {
    landscape: { w: 1920, h: 1200 },
    square: { w: 1600, h: 1600 },
    portrait: { w: 1350, h: 1800 },
  };

  const { w, h } = dimensions[format];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const palette =
    model === 'editorial'
      ? {
          bg: '#F8F7F4',
          headerBg: '#F8F7F4',
          headerBorder: '#CBD5E1',
          leftBg: '#F8F7F4',
          rightBg: '#EFF3F8',
          leftText: '#0F2342',
          rightText: '#0F2342',
          leftAccent: '#D9531E',
          rightAccent: '#0369A1',
          leftSub: '#334155',
          rightSub: '#0369A1',
          logoPrimary: '#0F2342',
          logoAccent: '#D9531E',
          phoneText: '#0F2342',
          trustBg: '#FFFFFF',
          trustText: '#0F2342',
          trustIcon: '#D9531E',
          footerBg: '#0F2342',
          footerLoc: '#E2E8F0',
          footerSlogan: '#FDE047',
        }
      : model === 'industrial'
        ? {
            bg: '#0B1220',
            headerBg: '#0F172A',
            headerBorder: '#1E293B',
            leftBg: '#131C2E',
            rightBg: '#131C2E',
            leftText: '#F8FAFC',
            rightText: '#F8FAFC',
            leftAccent: '#F59E0B',
            rightAccent: '#38BDF8',
            leftSub: '#CBD5E1',
            rightSub: '#CBD5E1',
            logoPrimary: '#F8FAFC',
            logoAccent: '#F59E0B',
            phoneText: '#FFFFFF',
            trustBg: '#0F172A',
            trustText: '#E2E8F0',
            trustIcon: '#F59E0B',
            footerBg: '#F59E0B',
            footerLoc: '#0B1220',
            footerSlogan: '#0B1220',
          }
        : {
            bg: '#FFFFFF',
            headerBg: '#FFFFFF',
            headerBorder: '#E2E8F0',
            leftBg: '#B91C1C',
            rightBg: '#0B2559',
            leftText: '#FFFFFF',
            rightText: '#FFFFFF',
            leftAccent: '#FACC15',
            rightAccent: '#38BDF8',
            leftSub: '#FEF08A',
            rightSub: '#BAE6FD',
            logoPrimary: '#0B2559',
            logoAccent: '#EA580C',
            phoneText: '#0B2559',
            trustBg: '#FACC15',
            trustText: '#0B2559',
            trustIcon: '#0B2559',
            footerBg: '#0F172A',
            footerLoc: '#E2E8F0',
            footerSlogan: '#FACC15',
          };

  // Base background
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, w, h);

  const headerH = 190;
  const trustH = 92;
  const footerH = 112;
  const bodyY = headerH;
  const bodyH = h - headerH - trustH - footerH;

  // Header
  ctx.fillStyle = palette.headerBg;
  ctx.fillRect(0, 0, w, headerH);
  ctx.strokeStyle = palette.headerBorder;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, headerH);
  ctx.lineTo(w, headerH);
  ctx.stroke();

  drawGisLogo(
    ctx,
    56,
    46,
    1.25,
    content.brandAcronym,
    palette.logoPrimary,
    palette.logoAccent
  );

  // Company Name + Tagline
  ctx.fillStyle = palette.logoPrimary;
  ctx.font = '800 42px "Bricolage Grotesque", sans-serif';
  ctx.fillText(content.companyName, 330, 92);

  ctx.fillStyle = palette.logoAccent;
  ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(content.tagline, 330, 132);

  // Phones top-right
  ctx.textAlign = 'right';
  ctx.fillStyle = model === 'industrial' ? '#94A3B8' : '#64748B';
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('COMMANDES & RENSEIGNEMENTS', w - 64, 72);

  ctx.fillStyle = palette.phoneText;
  ctx.font = '700 34px "JetBrains Mono", monospace';
  ctx.fillText(`${content.phones[0]} / ${content.phones[1]}`, w - 64, 122);
  ctx.textAlign = 'left';

  // Body Panels
  const isPortrait = format === 'portrait';
  const panelGap = model === 'industrial' ? 32 : 0;
  const pad = model === 'industrial' ? 40 : 0;

  const drawPanel = (
    px: number,
    py: number,
    pw: number,
    ph: number,
    bg: string,
    title: string,
    subtitle: string,
    items: string[],
    textColor: string,
    accentColor: string,
    subColor: string,
    indexLabel: string
  ) => {
    ctx.fillStyle = bg;
    if (model === 'industrial') {
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 18);
      ctx.fill();
      ctx.strokeStyle = '#26344D';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillRect(px, py, pw, ph);
    }

    const innerX = px + 64;
    let curY = py + 84;

    ctx.fillStyle = accentColor;
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(indexLabel, innerX, curY);

    curY += 54;
    ctx.fillStyle = textColor;
    ctx.font = '800 52px "Bricolage Grotesque", sans-serif';
    ctx.fillText(title, innerX, curY);

    curY += 20;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(innerX, curY);
    ctx.lineTo(innerX + 140, curY);
    ctx.stroke();

    curY += 44;
    ctx.fillStyle = subColor;
    ctx.font = '600 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(subtitle, innerX, curY);

    curY += 58;
    const stepY = Math.min(68, (ph - 290) / Math.max(items.length, 1));
    items.forEach((item, idx) => {
      ctx.fillStyle = accentColor;
      ctx.font = '700 22px "JetBrains Mono", monospace';
      ctx.fillText(`0${idx + 1}`, innerX, curY);

      ctx.fillStyle = textColor;
      ctx.font = '500 28px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(item, innerX + 54, curY);
      curY += stepY;
    });
  };

  if (isPortrait) {
    const pw = w - pad * 2;
    const ph = (bodyH - pad * 2 - panelGap) / 2;
    drawPanel(
      pad,
      bodyY + pad,
      pw,
      ph,
      palette.leftBg,
      content.hardware.title,
      content.hardware.subtitle,
      content.hardware.items,
      palette.leftText,
      palette.leftAccent,
      palette.leftSub,
      '01 · Pôle Bâtiment'
    );
    drawPanel(
      pad,
      bodyY + pad + ph + panelGap,
      pw,
      ph,
      palette.rightBg,
      content.beverages.title,
      content.beverages.subtitle,
      content.beverages.items,
      palette.rightText,
      palette.rightAccent,
      palette.rightSub,
      '02 · Pôle Distribution'
    );
  } else {
    const pw = (w - pad * 2 - panelGap) / 2;
    const ph = bodyH - pad * 2;
    drawPanel(
      pad,
      bodyY + pad,
      pw,
      ph,
      palette.leftBg,
      content.hardware.title,
      content.hardware.subtitle,
      content.hardware.items,
      palette.leftText,
      palette.leftAccent,
      palette.leftSub,
      '01 · Pôle Bâtiment'
    );
    drawPanel(
      pad + pw + panelGap,
      bodyY + pad,
      pw,
      ph,
      palette.rightBg,
      content.beverages.title,
      content.beverages.subtitle,
      content.beverages.items,
      palette.rightText,
      palette.rightAccent,
      palette.rightSub,
      '02 · Pôle Distribution'
    );
  }

  // Trust commitments bar
  const trustY = h - footerH - trustH;
  ctx.fillStyle = palette.trustBg;
  ctx.fillRect(0, trustY, w, trustH);
  ctx.strokeStyle = palette.headerBorder;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, trustY);
  ctx.lineTo(w, trustY);
  ctx.stroke();

  const colW = w / 4;
  content.commitments.forEach((commitment, idx) => {
    const cx = idx * colW + 44;
    if (idx > 0) {
      ctx.strokeStyle =
        model === 'dynamic' ? '#EAB308' : palette.headerBorder;
      ctx.beginPath();
      ctx.moveTo(idx * colW, trustY + 18);
      ctx.lineTo(idx * colW, trustY + trustH - 18);
      ctx.stroke();
    }
    ctx.fillStyle = palette.trustIcon;
    ctx.beginPath();
    ctx.arc(cx, trustY + trustH / 2, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = palette.trustText;
    ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(commitment, cx + 18, trustY + trustH / 2);
  });

  // Footer band (Location + Closing Slogan)
  const footerY = h - footerH;
  ctx.fillStyle = palette.footerBg;
  ctx.fillRect(0, footerY, w, footerH);

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = palette.footerLoc;
  ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
  const locLines = wrapText(ctx, content.location, w * 0.52);
  locLines.slice(0, 2).forEach((line, idx) => {
    ctx.fillText(line, 56, footerY + 46 + idx * 28);
  });

  ctx.textAlign = 'right';
  ctx.fillStyle = palette.footerSlogan;
  ctx.font = '800 26px "Bricolage Grotesque", sans-serif';
  ctx.fillText(content.closingSlogan, w - 56, footerY + 64);
  ctx.textAlign = 'left';

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `GIS-Galilee-Ivoire-Service-${model}-${format}.png`;
  link.href = dataUrl;
  link.click();
}
