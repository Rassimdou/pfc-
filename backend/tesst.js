// D:\pfc\backend\testt.js (or testt.mjs)
// This script is designed to help you verify your Gemini API key setup
// and list the models available to your specific API key.

// Ensure dotenv is installed: npm install dotenv
// Ensure @google/generative-ai is installed: npm install @google/generative-ai@latest
// Ensure your package.json has "type": "module"

// 1. Load environment variables from .env file.
// This MUST be the very first active line in your main script file.
// Adjust the 'path' if your .env file is not in the same directory as this script.
import dotenv from 'dotenv';
dotenv.config({ path: 'D:/pfc/backend/.env' }); // Assuming .env is in the project root

// 2. Import the GoogleGenerativeAI class from the library.
import { GoogleGenerativeAI } from '@google/generative-ai';

// 3. Import Node.js built-in modules for file system operations (for debugging package version).
import { readFileSync } from 'fs';
import { resolve } from 'path';

// --- Retrieve and Log API Key Status ---
const API_KEY = process.env.GEMINI_API_KEY;
console.log("API_KEY loaded from .env:", API_KEY ? "Loaded (not displayed for security)" : "Not Loaded");

// Exit if the API key is not found, as subsequent API calls will fail.
if (!API_KEY) {
  console.error("ERROR: GEMINI_API_KEY is not set in the .env file!");
  console.error("Please ensure your .env file is in the correct directory (e.g., D:/pfc/backend/.env)");
  console.error("and contains the line 'GEMINI_API_KEY=YOUR_ACTUAL_API_KEY_STRING'.");
  process.exit(1);
}

// --- Debugging: Verify Actively Loaded Package Version ---
// This helps confirm that Node.js is loading the expected version of the library.
try {
  const packageJsonPath = resolve(process.cwd(), 'node_modules/@google/generative-ai/package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  console.log("ACTUALLY LOADED @google/generative-ai version:", packageJson.version);
} catch (e) {
  console.error("Could not determine actively loaded package version:", e.message);
  console.error("Ensure 'node_modules/@google/generative-ai' exists and is readable.");
}

// --- Initialize GoogleGenerativeAI Client ---
const genAI = new GoogleGenerativeAI(API_KEY);

// --- Debugging: Inspect genAI Object ---
// These logs help diagnose if the GoogleGenerativeAI class is correctly loaded
// and if the listModels method is present on the instance.
console.log("\n--- Debugging genAI object ---");
console.log("Type of genAI:", typeof genAI);
console.log("Is genAI an instance of GoogleGenerativeAI?", genAI instanceof GoogleGenerativeAI);
console.log("Type of genAI.listModels:", typeof genAI.listModels); // This should be 'function'
console.log("--- End Debugging ---");

/**
 * Lists all available Gemini models for the configured API key.
 * This function is crucial for identifying the correct model IDs (e.g., 'gemini-1.0-pro').
 */
async function listAvailableModels() {
  console.log("\nAttempting to list available models with your API key...");
  try {
    // Attempt to call listModels. This is the line that previously caused TypeError.
    // If it works now, you'll see a list of models.
    const models = await genAI.listModels();
    console.log("\n--- Available Models for your API Key ---");
    let foundSupportedModel = false;
    for await (const model of models) {
      const supportedMethods = model.supportedGenerationMethods.join(', ');
      // Filter for models that support 'generateContent' as you need for text generation.
      if (supportedMethods.includes('generateContent')) {
        console.log(`- ID: ${model.name}, Supported Methods: ${supportedMethods}`);
        foundSupportedModel = true;
      }
    }
    if (!foundSupportedModel) {
      console.log("No models supporting 'generateContent' found with this API key.");
      console.log("Possible reasons: API key is invalid/restricted, or no such models are currently available in your region.");
    }
    console.log("\n--- End of Model List ---");
    console.log("Once you find a model ID (e.g., 'models/gemini-1.0-pro'),");
    console.log("update your getGenerativeModel({ model: 'YOUR_NEW_MODEL_ID' }) call in FileProcessingService.js.");
  } catch (error) {
    console.error("Error listing models:", error);
    // Provide more specific guidance based on common error types.
    if (error.message.includes("API key not valid")) {
        console.error("ACTION REQUIRED: Your API key string itself is still invalid or has incorrect permissions.");
        console.error("Please get a new one from Google AI Studio (aistudio.google.com/app/apikey)");
        console.error("or Google Cloud Console (console.cloud.google.com/apis/credentials) and verify its permissions.");
    } else if (error.message.includes("network")) {
        console.error("NETWORK ERROR: Check your internet connection or firewall settings.");
    } else if (error instanceof TypeError && error.message.includes("listModels is not a function")) {
        console.error("CRITICAL: The @google/generative-ai package is still not updated or correctly loaded.");
        console.error("Please ensure you have run 'npm install @google/generative-ai@latest' in your project root (D:/pfc/backend/)");
        console.error("and that 'package.json' shows a version >= 0.12.0. Then, delete 'node_modules' and 'package-lock.json' and run 'npm install' again.");
    }
  }
}

// *** IMPORTANT: Call this function to execute the model listing! ***
listAvailableModels();

// Keep your main PDF processing/Gemini call code commented out in FileProcessingService.js
// until you have confirmed the correct model ID from the output of this script.
