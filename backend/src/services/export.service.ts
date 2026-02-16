/**
 * Export Service
 * 
 * Verantwortlich für:
 * - PDF-Export von Markdown-Dateien
 * - Word-Export von Markdown-Dateien
 * - Markdown zu HTML/DOCX Konvertierung
 * - PDF-Generierung mit Puppeteer
 */

import puppeteer from 'puppeteer';
// @ts-ignore - markdown-it types not available
import MarkdownIt from 'markdown-it';
import {
  AlignmentType,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun
} from 'docx';
import { readFile } from './file.service';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
});

const BULLET_NUMBERING_REFERENCE = 'notenest-bullet-list';
const ORDERED_NUMBERING_REFERENCE = 'notenest-ordered-list';
const MAX_EXPORT_LIST_LEVEL = 8;

function countIndentation(rawIndent: string): number {
  return rawIndent.replace(/\t/g, '    ').length;
}

function normalizeMarkdownForExport(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const normalizedLines: string[] = [];
  let isInsideFence = false;

  for (const originalLine of lines) {
    const line = originalLine;
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('```')) {
      isInsideFence = !isInsideFence;
      normalizedLines.push(line);
      continue;
    }

    if (isInsideFence) {
      normalizedLines.push(line);
      continue;
    }

    const taskMatch = line.match(/^(\s*)[-*+]\s+\[( |x|X)\]\s+(.*)$/);
    if (taskMatch) {
      const level = Math.max(0, Math.floor(countIndentation(taskMatch[1]) / 2));
      const indent = '    '.repeat(level);
      const check = taskMatch[2].toLowerCase() === 'x' ? 'x' : ' ';
      normalizedLines.push(`${indent}- [${check}] ${taskMatch[3]}`);
      continue;
    }

    const checkboxMatch = line.match(/^(\s*)([☐☑])\s+(.*)$/);
    if (checkboxMatch) {
      const level = Math.max(0, Math.floor(countIndentation(checkboxMatch[1]) / 2));
      const indent = '    '.repeat(level);
      const check = checkboxMatch[2] === '☑' ? 'x' : ' ';
      normalizedLines.push(`${indent}- [${check}] ${checkboxMatch[3]}`);
      continue;
    }

    const bulletMatch = line.match(/^(\s*)[-*+•●○]\s+(.*)$/);
    if (bulletMatch) {
      const level = Math.max(0, Math.floor(countIndentation(bulletMatch[1]) / 2));
      const indent = '    '.repeat(level);
      normalizedLines.push(`${indent}- ${bulletMatch[2]}`);
      continue;
    }

    const orderedMatch = line.match(/^(\s*)(?:\d+[.)]|[a-zA-Z][)])\s+(.*)$/);
    if (orderedMatch) {
      const level = Math.max(0, Math.floor(countIndentation(orderedMatch[1]) / 2));
      const indent = '    '.repeat(level);
      normalizedLines.push(`${indent}1. ${orderedMatch[2]}`);
      continue;
    }

    normalizedLines.push(line);
  }

  return normalizedLines.join('\n');
}

function parseMarkdownListLine(line: string): {
  kind: 'bullet' | 'ordered';
  level: number;
  text: string;
} | null {
  const taskMatch = line.match(/^(\s*)-\s+\[( |x|X)\]\s+(.*)$/);
  if (taskMatch) {
    const level = Math.min(MAX_EXPORT_LIST_LEVEL, Math.floor(countIndentation(taskMatch[1]) / 4));
    const isDone = taskMatch[2].toLowerCase() === 'x';
    return {
      kind: 'bullet',
      level: Math.max(0, level),
      text: `${isDone ? '☑' : '☐'} ${taskMatch[3]}`
    };
  }

  const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
  if (bulletMatch) {
    const level = Math.min(MAX_EXPORT_LIST_LEVEL, Math.floor(countIndentation(bulletMatch[1]) / 4));
    return {
      kind: 'bullet',
      level: Math.max(0, level),
      text: bulletMatch[2]
    };
  }

  const orderedMatch = line.match(/^(\s*)(?:\d+[.)]|[a-zA-Z][)])\s+(.*)$/);
  if (orderedMatch) {
    const level = Math.min(MAX_EXPORT_LIST_LEVEL, Math.floor(countIndentation(orderedMatch[1]) / 4));
    return {
      kind: 'ordered',
      level: Math.max(0, level),
      text: orderedMatch[2]
    };
  }

  return null;
}

function createListNumberingConfig() {
  return [
    {
      reference: BULLET_NUMBERING_REFERENCE,
      levels: Array.from({ length: MAX_EXPORT_LIST_LEVEL + 1 }, (_, level) => {
        const bulletSymbols = ['●', '○', '■'];
        return {
          level,
          format: LevelFormat.BULLET,
          text: bulletSymbols[level % bulletSymbols.length],
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: {
                left: 720 + level * 360,
                hanging: 260
              }
            }
          }
        };
      })
    },
    {
      reference: ORDERED_NUMBERING_REFERENCE,
      levels: Array.from({ length: MAX_EXPORT_LIST_LEVEL + 1 }, (_, level) => {
        const placeHolderIndex = level + 1;
        if (level === 1) {
          return {
            level,
            format: LevelFormat.LOWER_LETTER,
            text: `%${placeHolderIndex})`,
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: {
                  left: 720 + level * 360,
                  hanging: 260
                }
              }
            }
          };
        }

        return {
          level,
          format: LevelFormat.DECIMAL,
          text: `%${placeHolderIndex}.`,
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: {
                left: 720 + level * 360,
                hanging: 260
              }
            }
          }
        };
      })
    }
  ];
}

/**
 * CSS-Template für PDF-Export
 */
function getPDFCSS(size: 'A4' | 'A5'): string {
  const fontSize = size === 'A4' ? '11pt' : '9pt';
  const margin = size === 'A4' ? '2cm' : '1.5cm';
  
  return `
    @page {
      size: ${size};
      margin: ${margin};
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: ${fontSize};
      line-height: 1.6;
      color: #000;
      margin: 0;
      padding: 0;
    }
    
    h1 {
      font-size: ${size === 'A4' ? '24pt' : '20pt'};
      margin-top: 1em;
      margin-bottom: 0.5em;
      font-weight: 700;
      page-break-after: avoid;
    }
    
    h2 {
      font-size: ${size === 'A4' ? '20pt' : '16pt'};
      margin-top: 0.8em;
      margin-bottom: 0.4em;
      font-weight: 600;
      page-break-after: avoid;
    }
    
    h3 {
      font-size: ${size === 'A4' ? '16pt' : '14pt'};
      margin-top: 0.6em;
      margin-bottom: 0.3em;
      font-weight: 600;
      page-break-after: avoid;
    }
    
    h4, h5, h6 {
      font-size: ${size === 'A4' ? '14pt' : '12pt'};
      margin-top: 0.5em;
      margin-bottom: 0.25em;
      font-weight: 600;
      page-break-after: avoid;
    }
    
    p {
      margin-bottom: 1em;
      text-align: justify;
    }
    
    ul, ol {
      margin-bottom: 1em;
      padding-left: 2em;
    }

    ul {
      list-style-type: disc;
    }

    ul ul {
      list-style-type: circle;
    }

    ul ul ul {
      list-style-type: square;
    }

    ol {
      list-style-type: decimal;
    }

    ol ol {
      list-style-type: lower-alpha;
    }
    
    li {
      margin-bottom: 0.5em;
    }
    
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', 'Consolas', monospace;
      font-size: 0.9em;
    }
    
    pre {
      background: #f5f5f5;
      padding: 1em;
      border-radius: 5px;
      overflow-x: auto;
      page-break-inside: avoid;
      margin-bottom: 1em;
    }
    
    pre code {
      background: none;
      padding: 0;
    }
    
    blockquote {
      border-left: 4px solid #007AFF;
      padding-left: 1em;
      margin-left: 0;
      margin-bottom: 1em;
      color: #666;
      font-style: italic;
      page-break-inside: avoid;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1em;
      page-break-inside: avoid;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 0.5em;
      text-align: left;
    }
    
    th {
      background: #f5f5f5;
      font-weight: 600;
    }
    
    a {
      color: #007AFF;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    img {
      max-width: 100%;
      height: auto;
      page-break-inside: avoid;
    }
    
    hr {
      border: none;
      border-top: 1px solid #ddd;
      margin: 2em 0;
    }
    
    /* Bibelstellen-Styling */
    .bible-reference {
      color: #007AFF;
      text-decoration: underline;
    }
  `;
}

/**
 * Findet Bibelstellen in einem Text (vereinfachte Version)
 */
function findBibleReferencesInText(text: string): Array<{ text: string; start: number; end: number; reference: string }> {
  const matches: Array<{ text: string; start: number; end: number; reference: string }> = [];
  
  // Vereinfachtes Pattern für Bibelstellen (ähnlich wie im Frontend)
  // WICHTIG: Patterns mit Vers müssen VOR Patterns ohne Vers kommen
  const patterns = [
    /(?:Psalm|Ps|Psalmen)\s+\d+[,:\s]+\d+(?:[-–—]\d+)?/gi,
    /\d+\.?\s*Mose\s+\d+[,:\s]+\d+(?:[-–—]\d+)?/gi,
    /(?:Matthäus|Mt|Markus|Mk|Lukas|Lk|Johannes|Joh|Apostelgeschichte|Apg|Römer|Röm|Galater|Gal|Epheser|Eph|Philipper|Phil|Kolosser|Kol|Jakobus|Jak|Hebräer|Hebr|Offenbarung|Offb|Apokalypse)\s+\d+[,:\s]+\d+(?:[-–—]\d+)?/gi,
    /\d+\.?\s*(?:Samuel|Könige|Chronik|Korinther|Kor|Thessalonicher|Thess|Timotheus|Tim|Petrus|Petr|Johannes|Joh)\s+\d+[,:\s]+\d+(?:[-–—]\d+)?/gi,
    /(?:Psalm|Ps|Psalmen)\s+\d+(?![,:\s]\d)/gi,
    /\d+\.?\s*Mose\s+\d+(?![,:\s]\d)/gi,
    /(?:Matthäus|Mt|Markus|Mk|Lukas|Lk|Johannes|Joh|Apostelgeschichte|Apg|Römer|Röm|Galater|Gal|Epheser|Eph|Philipper|Phil|Kolosser|Kol|Jakobus|Jak|Hebräer|Hebr|Offenbarung|Offb|Apokalypse)\s+\d+(?![,:\s]\d)/gi,
    /\d+\.?\s*(?:Samuel|Könige|Chronik|Korinther|Kor|Thessalonicher|Thess|Timotheus|Tim|Petrus|Petr|Johannes|Joh)\s+\d+(?![,:\s]\d)/gi
  ];
  
  for (const pattern of patterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    regex.lastIndex = 0;
    
    while ((match = regex.exec(text)) !== null) {
      const matchText = match[0];
      const start = match.index;
      const end = start + matchText.length;
      
      // Prüfe auf Überlappungen
      let overlaps = false;
      for (const existingMatch of matches) {
        if (
          (start >= existingMatch.start && start < existingMatch.end) ||
          (end > existingMatch.start && end <= existingMatch.end) ||
          (start <= existingMatch.start && end >= existingMatch.end)
        ) {
          if (matchText.length > existingMatch.text.length) {
            const index = matches.indexOf(existingMatch);
            matches.splice(index, 1);
          } else {
            overlaps = true;
          }
          break;
        }
      }
      
      if (!overlaps) {
        matches.push({
          text: matchText,
          start,
          end,
          reference: matchText.trim()
        });
      }
    }
  }
  
  matches.sort((a, b) => a.start - b.start);
  return matches;
}

/**
 * Konvertiert Markdown zu HTML und fügt Bibelstellen-Links hinzu
 */
function markdownToHTML(markdown: string): string {
  // Finde Bibelstellen im Markdown
  const bibleRefs = findBibleReferencesInText(markdown);
  
  // Ersetze Bibelstellen durch Markdown-Links (rückwärts, um Indizes nicht zu verschieben)
  let processedMarkdown = markdown;
  const sortedRefs = [...bibleRefs].sort((a, b) => b.start - a.start);
  
  for (const ref of sortedRefs) {
    // Prüfe, ob die Bibelstelle bereits in einem Link ist
    const beforeText = processedMarkdown.substring(0, ref.start);
    const afterText = processedMarkdown.substring(ref.end);
    
    // Prüfe, ob vorher ein `[` oder `](` kommt (bereits ein Link)
    if (beforeText.match(/\[[^\]]*$/)) {
      continue; // Überspringe, wenn bereits in einem Link
    }
    
    // Erstelle Markdown-Link
    const linkText = `[${ref.text}](bible://${encodeURIComponent(ref.reference)})`;
    processedMarkdown = beforeText + linkText + afterText;
  }
  
  // Rendere Markdown zu HTML
  let html = md.render(processedMarkdown);
  
  // Ersetze bible:// Links durch klickbare Links mit Styling (für PDF)
  html = html.replace(
    /<a href="bible:\/\/([^"]+)">([^<]+)<\/a>/g,
    '<a href="bible://$1" class="bible-reference" title="Bibelstelle: $2" style="color: #007AFF; text-decoration: underline;">$2</a>'
  );
  
  return html;
}

/**
 * Generiert ein vollständiges HTML-Dokument für PDF-Export
 */
function createHTMLDocument(html: string, size: 'A4' | 'A5', title?: string): string {
  const css = getPDFCSS(size);
  
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title || 'Export'}</title>
      <style>${css}</style>
    </head>
    <body>
      ${html}
    </body>
    </html>
  `;
}

/**
 * Generiert PDF aus Markdown-Content
 */
export async function generatePDF(
  markdown: string,
  options: {
    size?: 'A4' | 'A5';
    title?: string;
  } = {}
): Promise<Buffer> {
  const { size = 'A4', title } = options;
  
  // 1. Listen-Normalisierung, damit Einrückung/Marker in allen Exporten konsistent sind
  const normalizedMarkdown = normalizeMarkdownForExport(markdown);

  // 2. Markdown zu HTML konvertieren
  const html = markdownToHTML(normalizedMarkdown);
  
  // 3. Vollständiges HTML-Dokument erstellen
  const fullHTML = createHTMLDocument(html, size, title);
  
  // 4. Puppeteer Browser starten
  // Prüfe, ob Chromium im Container verfügbar ist (Docker/Alpine)
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || 
    (process.platform === 'linux' ? '/usr/bin/chromium-browser' : undefined);
  
  const launchOptions: any = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer'
    ]
  };
  
  if (executablePath) {
    launchOptions.executablePath = executablePath;
  }
  
  const browser = await puppeteer.launch(launchOptions);
  
  try {
    const page = await browser.newPage();
    
    // 5. HTML laden
    await page.setContent(fullHTML, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // 6. PDF generieren
    const pdfBuffer = await page.pdf({
      format: size,
      printBackground: true,
      margin: {
        top: size === 'A4' ? '2cm' : '1.5cm',
        right: size === 'A4' ? '2cm' : '1.5cm',
        bottom: size === 'A4' ? '2cm' : '1.5cm',
        left: size === 'A4' ? '2cm' : '1.5cm'
      }
    });
    
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

/**
 * Exportiert eine Datei als PDF
 */
export async function exportFileAsPDF(
  userId: number,
  filePath: string,
  fileType: 'private' | 'shared',
  size: 'A4' | 'A5' = 'A4'
): Promise<Buffer> {
  // 1. Datei lesen
  const content = await readFile(userId, filePath, fileType);
  
  // 2. Dateiname für Titel extrahieren
  const fileName = filePath.split('/').pop() || 'Export';
  const title = fileName.replace(/\.(md|txt)$/i, '');
  
  // 3. PDF generieren
  return await generatePDF(content, { size, title });
}

/**
 * Konvertiert Markdown zu DOCX-Paragraphen
 */
function markdownToDocx(markdown: string): Paragraph[] {
  const lines = markdown.split('\n');
  const paragraphs: Paragraph[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    
    if (!line) {
      // Leere Zeile
      paragraphs.push(new Paragraph({ text: '' }));
      continue;
    }
    
    // Überschriften
    if (line.startsWith('# ')) {
      paragraphs.push(new Paragraph({
        text: line.substring(2),
        heading: HeadingLevel.HEADING_1
      }));
      continue;
    }
    if (line.startsWith('## ')) {
      paragraphs.push(new Paragraph({
        text: line.substring(3),
        heading: HeadingLevel.HEADING_2
      }));
      continue;
    }
    if (line.startsWith('### ')) {
      paragraphs.push(new Paragraph({
        text: line.substring(4),
        heading: HeadingLevel.HEADING_3
      }));
      continue;
    }
    if (line.startsWith('#### ')) {
      paragraphs.push(new Paragraph({
        text: line.substring(5),
        heading: HeadingLevel.HEADING_4
      }));
      continue;
    }
    if (line.startsWith('##### ')) {
      paragraphs.push(new Paragraph({
        text: line.substring(6),
        heading: HeadingLevel.HEADING_5
      }));
      continue;
    }
    if (line.startsWith('###### ')) {
      paragraphs.push(new Paragraph({
        text: line.substring(7),
        heading: HeadingLevel.HEADING_6
      }));
      continue;
    }
    
    // Blockquote
    if (line.startsWith('> ')) {
      paragraphs.push(new Paragraph({
        text: line.substring(2),
        indent: { left: 400 },
        spacing: { after: 200 }
      }));
      continue;
    }
    
    // Code-Block (vereinfacht - erkennt nur ``` am Anfang)
    if (line.startsWith('```')) {
      // Code-Block startet - sammle alle Zeilen bis zum Ende
      const codeLines: string[] = [];
      i++; // Überspringe die ``` Zeile
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      // Füge Code als Paragraph hinzu
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: codeLines.join('\n'),
            font: 'Courier New'
          })
        ],
        spacing: { after: 200 }
      }));
      continue;
    }
    
    const listLine = parseMarkdownListLine(rawLine);
    if (listLine) {
      paragraphs.push(new Paragraph({
        children: parseInlineFormatting(listLine.text),
        numbering: {
          reference: listLine.kind === 'ordered'
            ? ORDERED_NUMBERING_REFERENCE
            : BULLET_NUMBERING_REFERENCE,
          level: listLine.level
        },
        spacing: { after: 100 }
      }));
      continue;
    }
    
    // Normaler Text - parse inline Formatierung
    const children = parseInlineFormatting(line);
    paragraphs.push(new Paragraph({
      children,
      spacing: { after: 200 }
    }));
  }
  
  return paragraphs;
}

/**
 * Parst inline Markdown-Formatierung (bold, italic, code, links) und Bibelstellen
 */
function parseInlineFormatting(text: string): (TextRun | ExternalHyperlink)[] {
  const runs: (TextRun | ExternalHyperlink)[] = [];
  
  // Finde Bibelstellen zuerst
  const bibleRefs = findBibleReferencesInText(text);
  
  // Regex für verschiedene Formatierungen
  const patterns = [
    { regex: /\*\*(.+?)\*\*/g, bold: true }, // **bold**
    { regex: /\*(.+?)\*/g, italics: true }, // *italic*
    { regex: /`(.+?)`/g, code: true }, // `code`
    { regex: /\[(.+?)\]\((.+?)\)/g, link: true } // [text](url)
  ];
  
  // Sammle alle Matches (inkl. Bibelstellen)
  const matches: Array<{ start: number; end: number; text: string; style: any; url?: string; isBible?: boolean }> = [];
  
  // Füge Bibelstellen hinzu
  for (const ref of bibleRefs) {
    matches.push({
      start: ref.start,
      end: ref.end,
      text: ref.text,
      style: {},
      url: `bible://${encodeURIComponent(ref.reference)}`,
      isBible: true
    });
  }
  
  // Füge andere Formatierungen hinzu (ohne Überlappungen mit Bibelstellen)
  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern.regex.source, 'g');
    while ((match = regex.exec(text)) !== null) {
      const matchStart = match.index!;
      const matchEnd = matchStart + match[0].length;
      let overlaps = false;
      
      // Prüfe Überlappung mit Bibelstellen
      for (const bibleRef of bibleRefs) {
        if (
          (matchStart >= bibleRef.start && matchStart < bibleRef.end) ||
          (matchEnd > bibleRef.start && matchEnd <= bibleRef.end) ||
          (matchStart <= bibleRef.start && matchEnd >= bibleRef.end)
        ) {
          overlaps = true;
          break;
        }
      }
      
      if (!overlaps) {
        matches.push({
          start: matchStart,
          end: matchEnd,
          text: pattern.link ? match[1] : match[1],
          style: {
            bold: pattern.bold || false,
            italics: pattern.italics || false,
            font: pattern.code ? 'Courier New' : undefined
          },
          url: pattern.link ? match[2] : undefined
        });
      }
    }
  }
  
  // Sortiere Matches nach Position
  matches.sort((a, b) => a.start - b.start);
  
  // Erstelle TextRuns/Hyperlinks
  let lastIndex = 0;
  for (const match of matches) {
    // Text vor dem Match
    if (match.start > lastIndex) {
      const beforeText = text.substring(lastIndex, match.start);
      if (beforeText) {
        runs.push(new TextRun(beforeText));
      }
    }
    
    // Der formatierte Text
    if (match.url) {
      // Hyperlink (Bibelstelle oder normaler Link)
      runs.push(new ExternalHyperlink({
        children: [new TextRun({
          text: match.text,
          color: match.isBible ? '007AFF' : '0563C1',
          style: 'Hyperlink'
        })],
        link: match.url
      }));
    } else {
      // Formatierter Text ohne Link
      runs.push(new TextRun({
        text: match.text,
        bold: match.style.bold,
        italics: match.style.italics,
        font: match.style.font
      }));
    }
    
    lastIndex = match.end;
  }
  
  // Restlicher Text
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      runs.push(new TextRun(remainingText));
    }
  }
  
  // Falls keine Matches gefunden wurden, gib einfachen Text zurück
  if (runs.length === 0) {
    runs.push(new TextRun(text));
  }
  
  return runs;
}

/**
 * Generiert DOCX aus Markdown-Content
 */
export async function generateDOCX(
  markdown: string,
  options: {
    title?: string;
  } = {}
): Promise<Buffer> {
  const { title } = options;
  
  // 1. Listen normalisieren und dann zu DOCX-Paragraphen konvertieren
  const normalizedMarkdown = normalizeMarkdownForExport(markdown);
  const paragraphs = markdownToDocx(normalizedMarkdown);
  
  // 2. Erstelle Word-Dokument
  const doc = new Document({
    numbering: {
      config: createListNumberingConfig()
    },
    sections: [{
      properties: {},
      children: [
        // Titel (optional)
        ...(title ? [new Paragraph({
          text: title,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 400 }
        })] : []),
        // Inhalt
        ...paragraphs
      ]
    }]
  });
  
  // 3. Generiere DOCX-Buffer
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

/**
 * Exportiert eine Datei als Word-Dokument
 */
export async function exportFileAsWord(
  userId: number,
  filePath: string,
  fileType: 'private' | 'shared'
): Promise<Buffer> {
  // 1. Datei lesen
  const content = await readFile(userId, filePath, fileType);
  
  // 2. Dateiname für Titel extrahieren
  const fileName = filePath.split('/').pop() || 'Export';
  const title = fileName.replace(/\.(md|txt)$/i, '');
  
  // 3. DOCX generieren
  return await generateDOCX(content, { title });
}

