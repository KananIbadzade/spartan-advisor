/**
 * PDF Transcript Parser
 * Extracts course data from SJSU transcript PDFs (including scanned images)
 * Uses GPT-4 Vision API to read scanned transcripts
 */

import * as pdfjsLib from 'pdfjs-dist';
import OpenAI from 'openai';

// FIX: Use local worker via Vite import to prevent CORS errors with CDNs
// This serves the worker from the same origin as the app
// @ts-ignore
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface ParsedCourse {
  code: string;           // e.g., "CS 46A"
  title?: string;         // e.g., "Introduction to Programming"
  units?: number;         // e.g., 4
  grade?: string;         // e.g., "A", "B+", "P", "IP"
  semester?: string;      // e.g., "Fall 2023"
  year?: string;          // e.g., "2023"
}

/**
 * Extract text from PDF file
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    console.log("DEBUG: Starting text extraction...");
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    console.log(`DEBUG: PDF loaded for text extraction. Pages: ${pdf.numPages}`);

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

    console.log(`DEBUG: Extracted ${fullText.length} characters of text.`);
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
  console.log("DEBUG: Parsing courses from text...");
  const courses: ParsedCourse[] = [];

  // Common course code pattern: 2-4 uppercase letters + space + number + optional letter
  // Examples: "CS 46A", "CMPE 133", "MATH 30", "ENGR 10"
  const coursePattern = /([A-Z]{2,4})\s+(\d{1,3}[A-Z]?)/g;

  // Grade patterns: A, A-, B+, B, C, etc. Also P (Pass), F (Fail), W (Withdrawn), IP (In Progress)
  const gradePattern = /\b([ABCDF][+-]?|P|NP|W|WU|I|IC|RD|RP|IP)\b/;

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

      // Add if we found a grade OR if it looks like a valid course entry
      if (course.grade) {
        courses.push(course);
      }
    }
  }

  // Remove duplicates (same course code)
  const uniqueCourses = courses.filter((course, index, self) =>
    index === self.findIndex((c) => c.code === course.code)
  );

  console.log(`DEBUG: Found ${uniqueCourses.length} unique courses from text.`);
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
    console.log("DEBUG: Loading PDF for Vision...");
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    console.log(`DEBUG: PDF has ${pdf.numPages} pages`);

    // Prepare content array for GPT-4o (text prompt + multiple images)
    const contentParts: any[] = [
      {
        type: 'text',
        text: `You are a transcript parser. Extract ALL courses from these SJSU transcript images.
        
        For each course, extract:
        - Course code (e.g., "CS 46A", "CMPE 133", "MATH 30")
        - Grade (e.g., "A", "B+", "C", "CR"). 
          IMPORTANT: If a course is currently "In Progress" or has no grade yet, set grade to "IP".
        - Units/Credits (e.g., 3.0, 4.0)
        - Semester (e.g., "Fall 2023", "Spring 2024")
        - Year (e.g., "2023", "2024")

        Return ONLY a JSON array. Format:
        [{"code": "CS 46A", "grade": "A", "units": 4, "semester": "Fall 2023", "year": "2023"}, ...]

        Rules:
        1. Scan ALL pages provided.
        2. Include ALL completed courses.
        3. Include ALL "In Progress" courses (mark grade as "IP").
        4. Include transfer credits if visible.
        5. Do NOT include withdrawn courses (W, WU) unless they are the most recent attempt.
        6. Be precise with course codes.`
      }
    ];

    // Convert ALL pages to images
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`DEBUG: Processing page ${i}/${pdf.numPages} for Vision...`);
      const page = await pdf.getPage(i);
      const base64Image = await pdfPageToBase64Image(page);
      
      contentParts.push({
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${base64Image}`
        }
      });
    }

    console.log(`DEBUG: Sending ${contentParts.length - 1} pages to GPT-4o...`);

    // Send to GPT-4o
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4000, // Increased token limit for full transcript
      messages: [
        {
          role: 'user',
          content: contentParts
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from GPT-4 Vision');
    }

    console.log('DEBUG: GPT-4 response received. Length:', content.length);

    // Parse JSON response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not find JSON in response');
    }

    const courses = JSON.parse(jsonMatch[0]) as ParsedCourse[];
    console.log(`DEBUG: Extracted ${courses.length} courses using Vision API`);

    return courses;
  } catch (error) {
    console.error('DEBUG: Error parsing with GPT-4 Vision:', error);
    throw error;
  }
}

/**
 * Main function: Parse PDF file and extract course data
 * Tries Vision API first (for scanned PDFs), falls back to text extraction
 */
export async function parseTranscript(file: File): Promise<ParsedCourse[]> {
  try {
    console.log('DEBUG: Starting transcript parsing...');

    // Try GPT-4 Vision first (works for both scanned and text PDFs)
    try {
      const courses = await parseTranscriptWithVision(file);
      return courses;
    } catch (visionError) {
      console.error('DEBUG: Vision API failed, trying text extraction fallback:', visionError);

      // Fallback: Try text extraction (for text-based PDFs)
      const text = await extractTextFromPDF(file);
      
      const courses = parseCoursesFromText(text);
      console.log(`DEBUG: Found ${courses.length} courses using text extraction`);

      return courses;
    }
  } catch (error) {
    console.error('DEBUG: Fatal error parsing transcript:', error);
    throw error;
  }
}
