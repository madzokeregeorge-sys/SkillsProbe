// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

export const extractTextFromPDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
};

// Alias for backward compatibility
export const extractTextFromPdf = extractTextFromPDF;

export const readTextFile = async (file: File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

// Alias for backward compatibility
export const readFileAsText = readTextFile;

// Unified file parser — handles PDF and text files
export const parseFile = async (file: File): Promise<string> => {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') {
    return extractTextFromPDF(file);
  }
  return readTextFile(file);
};