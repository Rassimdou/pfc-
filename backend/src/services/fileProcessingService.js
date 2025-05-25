import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import { ScheduleParser } from '../utils/scheduleParser.js';
import pdfParse from 'pdf-parse';
import * as XLSX from 'xlsx';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ScheduleService from './scheduleService.js';

const execAsync = promisify(exec);

// Initialize Gemini
if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set in environment variables');
  throw new Error('Gemini API key is not configured');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class FileProcessingService {
  static getFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ext.substring(1);
  }

  static async extractWithGemini(text, fileType) {
    try {
      if (!text) {
        throw new Error('No text provided for extraction');
      }

      // Get the model with the latest configuration
      const model = genAI.getGenerativeModel({ 
        model: "gemini-pro",
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 4096,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      });

      const prompt = `Extract schedule information from the following ${fileType} content. 
      Return the data in this exact JSON format:
      {
        "headerInfo": {
          "university": "",
          "speciality": "",
          "section": "",
          "academicYear": "",
          "semester": "",
          "date": ""
        },
        "scheduleEntries": [
          {
            "dayOfWeek": "",
            "startTime": "",
            "endTime": "",
            "moduleName": "",
            "professorName": "",
            "sectionName": "",
            "roomNumber": "",
            "roomType": "",
            "type": "COURSE"
          }
        ]
      }

      Content to analyze:
      ${text}`;

      console.log('Sending request to Gemini API...');
      const result = await model.generateContent(prompt);
      console.log('Received response from Gemini API');
      
      const response = await result.response;
      const responseText = response.text();
      
      console.log('Parsing Gemini response...');
      // Parse the JSON response
      const extractedData = JSON.parse(responseText);
      console.log('Successfully parsed Gemini response');
      
      return extractedData;
    } catch (error) {
      console.error('Error extracting with Gemini:', error);
      if (error.message.includes('API key')) {
        throw new Error('Gemini API key is invalid or not configured properly');
      } else if (error.message.includes('model')) {
        throw new Error('Gemini model configuration error. Please check the model name and parameters');
      } else if (error instanceof SyntaxError) {
        throw new Error('Failed to parse Gemini response as JSON. The model might have returned invalid JSON');
      }
      throw error;
    }
  }

  static async processPdfFile(filePath, options = {}) {
    try {
      console.log('Processing PDF file:', filePath);
      
      // Read the PDF file
      const dataBuffer = await readFile(filePath);
      
      // Extract text from PDF
      const data = await pdfParse(dataBuffer);
      
      if (!data || !data.text) {
        throw new Error('Failed to extract text from PDF');
      }

      console.log('PDF text extracted successfully');
      
      // Use Gemini to extract structured data
      const extractedData = await this.extractWithGemini(data.text, 'pdf');
      
      // Save to database if options are provided
      let dbResult = null;
      if (options.saveToDatabase && options.specialityName && options.academicYear && options.semester && options.sectionName) {
        dbResult = await ScheduleService.saveScheduleToDatabase(extractedData, options);
      }
      
      return {
        success: true,
        data: extractedData,
        formattedOutput: extractedData.scheduleEntries.map(entry => 
          `${entry.dayOfWeek} ${entry.startTime}-${entry.endTime} ${entry.moduleName} ${entry.professorName}`
        ),
        databaseReady: extractedData,
        dbResult
      };
    } catch (error) {
      console.error('Error processing PDF:', error);
      return {
        success: false,
        error: error.message,
        details: error.stack
      };
    }
  }

  static async processDocxFile(filePath, options = {}) {
    try {
      console.log('Starting DOCX processing for file:', filePath);
      const buffer = await readFile(filePath);
      console.log('File read successfully, size:', buffer.length);
      
      // Convert DOCX to text
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value;
      
      // Use Gemini to extract structured data
      const extractedData = await this.extractWithGemini(text, 'docx');
      
      // Save to database if options are provided
      let dbResult = null;
      if (options.saveToDatabase && options.specialityName && options.academicYear && options.semester && options.sectionName) {
        dbResult = await ScheduleService.saveScheduleToDatabase(extractedData, options);
      }
      
      return {
        success: true,
        data: extractedData,
        formattedOutput: extractedData.scheduleEntries.map(entry => 
          `${entry.dayOfWeek} ${entry.startTime}-${entry.endTime} ${entry.moduleName} ${entry.professorName}`
        ),
        databaseReady: extractedData,
        dbResult
      };
    } catch (error) {
      console.error('Error processing DOCX:', error);
      return {
        success: false,
        error: error.message,
        details: error.stack
      };
    }
  }

  static async processExcelFile(filePath, options = {}) {
    try {
      const buffer = await readFile(filePath);
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Convert Excel data to text format
      const text = data.map(row => row.join('\t')).join('\n');
      
      // Use Gemini to extract structured data
      const extractedData = await this.extractWithGemini(text, 'excel');
      
      // Save to database if options are provided
      let dbResult = null;
      if (options.saveToDatabase && options.specialityName && options.academicYear && options.semester && options.sectionName) {
        dbResult = await ScheduleService.saveScheduleToDatabase(extractedData, options);
      }
      
      return {
        success: true,
        data: extractedData,
        formattedOutput: extractedData.scheduleEntries.map(entry => 
          `${entry.dayOfWeek} ${entry.startTime}-${entry.endTime} ${entry.moduleName} ${entry.professorName}`
        ),
        databaseReady: extractedData,
        dbResult
      };
    } catch (error) {
      console.error('Error processing Excel:', error);
      return {
        success: false,
        error: error.message,
        details: error.stack
      };
    }
  }

  static async processFile(filePath) {
    try {
      console.log('Starting file processing');
      console.log('Processing file:', filePath, 'Type:', this.getFileType(filePath));

      const fileType = this.getFileType(filePath);
      let result;

      switch (fileType) {
        case 'pdf':
          result = await this.processPdfFile(filePath);
          break;
        case 'docx':
          result = await this.processDocxFile(filePath);
          break;
        case 'xlsx':
        case 'xls':
          result = await this.processExcelFile(filePath);
          break;
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }

      console.log('File processing completed:', {
        success: result.success,
        hasData: !!result.data,
        error: result.error
      });

      return result;
    } catch (error) {
      console.error('Error processing file:', error);
      return {
        success: false,
        error: error.message,
        details: error.stack
      };
    }
  }
}

export default FileProcessingService;