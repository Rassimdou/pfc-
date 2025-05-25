import { GoogleGenerativeAI } from '@google/generative-ai';
import pdfplumber from 'pdfplumber';

class GeminiService {
  static async extractScheduleWithGemini(pdfPath) {
    try {
      // Initialize Gemini
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      // Extract text from PDF
      let extractedText = '';
      const pdf = await pdfplumber.open(pdfPath);
      for (const page of pdf.pages) {
        const text = await page.getText();
        extractedText += text + '\n';
      }
      await pdf.close();

      // Create prompt for Gemini
      const prompt = `Extract schedule information from the following text. Return the data in a structured JSON format with the following structure:
      {
        "headerInfo": {
          "speciality": "string",
          "section": "string",
          "academicYear": "string",
          "semester": "string"
        },
        "scheduleEntries": [
          {
            "day": "string (MONDAY/TUESDAY/etc)",
            "timeSlot": "string (e.g., 08:00-09:30)",
            "module": "string",
            "professor": "string",
            "room": "string",
            "type": "string (COURSE/TD/TP)",
            "groups": ["string"]
          }
        ]
      }

      Here's the text to analyze:
      ${extractedText}`;

      // Get response from Gemini
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the JSON response
      try {
        const scheduleData = JSON.parse(text);
        return {
          success: true,
          data: scheduleData
        };
      } catch (parseError) {
        console.error('Error parsing Gemini response:', parseError);
        return {
          success: false,
          error: 'Failed to parse Gemini response',
          rawResponse: text
        };
      }
    } catch (error) {
      console.error('Error in Gemini extraction:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default GeminiService; 