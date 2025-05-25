import { extractScheduleWithGemini } from '../services/geminiService.js';
import pdfplumber from 'pdfplumber';
import fs from 'fs';

async function testGeminiExtraction(pdfPath) {
  try {
    console.log('Starting PDF extraction test...');
    
    // Extract text from PDF
    let pdfText = '';
    const pdf = await pdfplumber.open(pdfPath);
    for (const page of pdf.pages) {
      pdfText += page.extract_text() || '';
    }
    await pdf.close();
    
    console.log('PDF text extracted successfully');
    console.log('First 200 characters of extracted text:', pdfText.substring(0, 200));
    
    // Use Gemini to extract schedule data
    console.log('Sending to Gemini for extraction...');
    const result = await extractScheduleWithGemini(pdfText);
    
    console.log('Extraction result:', JSON.stringify(result, null, 2));
    
    // Save the result to a file
    const outputPath = 'test_output.json';
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`Results saved to ${outputPath}`);
    
  } catch (error) {
    console.error('Error during extraction:', error);
  }
}

// Get PDF path from command line argument
const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error('Please provide a PDF path as an argument');
  process.exit(1);
}

testGeminiExtraction(pdfPath); 