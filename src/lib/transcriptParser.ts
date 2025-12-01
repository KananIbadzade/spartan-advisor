/**
 * PDF Transcript Parser
 * Extracts course data from SJSU transcript PDFs (including scanned images)
 * Uses GPT-4 Vision API to read scanned transcripts
 */

import * as pdfjsLib from 'pdfjs-dist';
import OpenAI from 'openai';

// Set worker path for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ParsedCourse {
  code: string;           // e.g., "CS 46A"
  title?: string;         // e.g., "Introduction to Programming"
  units?: number;         // e.g., 4
  grade?: string;         // e.g., "A", "B+", "P"
  semester?: string;      // e.g., "Fall 2023"
  year?: string;          // e.g., "2023"
}

/**
 * Extract text from PDF file
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Parse courses from extracted text
 * Looks for patterns like "CS 46A" followed by grades
 */
export function parseCoursesFromText(text: string): ParsedCourse[] {
  const courses: ParsedCourse[] = [];

  // Common course code pattern: 2-4 uppercase letters + space + number + optional letter
  // Examples: "CS 46A", "CMPE 133", "MATH 30", "ENGR 10"
  const coursePattern = /([A-Z]{2,4})\s+(\d{1,3}[A-Z]?)/g;

  // Grade patterns: A, A-, B+, B, C, etc. Also P (Pass), F (Fail), W (Withdrawn)
  const gradePattern = /\b([ABCDF][+-]?|P|NP|W|WU|I|IC|RD|RP)\b/;

  // Units pattern: typically "3.0" or "4" or "3 Units"
  const unitsPattern = /(\d+(?:\.\d+)?)\s*(?:units?)?/i;

  // Semester pattern: "Fall 2023", "Spring 2024", "Summer 2022"
  const semesterPattern = /(Fall|Spring|Summer|Winter)\s+(\d{4})/gi;

  const lines = text.split('\n');
  let currentSemester = '';
  let currentYear = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for semester headers
    const semesterMatch = line.match(semesterPattern);
    if (semesterMatch) {
      currentSemester = semesterMatch[0];
      const yearMatch = currentSemester.match(/(\d{4})/);
      currentYear = yearMatch ? yearMatch[1] : '';
    }

    // Find course codes
    let match;
    while ((match = coursePattern.exec(line)) !== null) {
      const courseCode = `${match[1]} ${match[2]}`;

      // Look for grade in the same line or next few characters
      const restOfLine = line.substring(match.index);
      const gradeMatch = restOfLine.match(gradePattern);

      // Look for units
      const unitsMatch = restOfLine.match(unitsPattern);

      const course: ParsedCourse = {
        code: courseCode,
        grade: gradeMatch ? gradeMatch[1] : undefined,
        units: unitsMatch ? parseFloat(unitsMatch[1]) : undefined,
        semester: currentSemester || undefined,
        year: currentYear || undefined
      };

      // Only add if we found a grade (indicates it's actually a completed course)
      if (course.grade && course.grade !== 'W' && course.grade !== 'WU') {
        courses.push(course);
      }
    }
  }

  // Remove duplicates (same course code)
  const uniqueCourses = courses.filter((course, index, self) =>
    index === self.findIndex((c) => c.code === course.code)
  );

  return uniqueCourses;
}

/**
 * Convert PDF page to base64 image for GPT-4 Vision
 */
async function pdfPageToBase64Image(page: any): Promise<string> {
  const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better quality
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;

  return canvas.toDataURL('image/png').split(',')[1]; // Return base64 without prefix
}

/**
 * Use GPT-4 Vision to extract course data from transcript image
 */
async function parseTranscriptWithVision(file: File): Promise<ParsedCourse[]> {
  try {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }

    const openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });

    // Load PDF
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    console.log(`PDF has ${pdf.numPages} pages`);

    // Convert first page to image (most transcripts have courses on first page)
    // TODO: Handle multi-page transcripts if needed
    const page = await pdf.getPage(1);
    const base64Image = await pdfPageToBase64Image(page);

    console.log('Sending transcript to GPT-4 Vision...');

    // Send to GPT-4 Vision
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract ALL courses from this SJSU transcript image. For each course, extract:
              - Course code (e.g., "CS 46A", "CMPE 133")
              - Grade (A, A-, B+, B, etc.)
              - Units/Credits (e.g., 3, 4)
              - Semester if visible (e.g., "Fall 2023")

              Return ONLY a JSON array with no other text. Format:
              [{"code": "CS 46A", "grade": "A", "units": 4, "semester": "Fall 2023"}, ...]

              Important: Only include courses with grades (skip withdrawn courses).`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Image}`
              }
            }
          ]
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from GPT-4 Vision');
    }

    console.log('GPT-4 Vision response:', content);

    // Parse JSON response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not find JSON in response');
    }

    const courses = JSON.parse(jsonMatch[0]) as ParsedCourse[];
    console.log(`Extracted ${courses.length} courses using Vision API`);

    return courses;
  } catch (error) {
    console.error('Error parsing with GPT-4 Vision:', error);
    throw error;
  }
}

/**
 * Main function: Parse PDF file and extract course data
 * Tries Vision API first (for scanned PDFs), falls back to text extraction
 */
export async function parseTranscript(file: File): Promise<ParsedCourse[]> {
  try {
    console.log('Starting transcript parsing...');

    // Try GPT-4 Vision first (works for both scanned and text PDFs)
    try {
      const courses = await parseTranscriptWithVision(file);
      return courses;
    } catch (visionError) {
      console.error('Vision API failed, trying text extraction:', visionError);

      // Fallback: Try text extraction (for text-based PDFs)
      const text = await extractTextFromPDF(file);
      console.log(`Extracted ${text.length} characters from PDF`);

      const courses = parseCoursesFromText(text);
      console.log(`Found ${courses.length} courses using text extraction`);

      return courses;
    }
  } catch (error) {
    console.error('Error parsing transcript:', error);
    throw error;
  }
}
