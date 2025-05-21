import xlsx from 'xlsx';
import fs from 'fs/promises';

/**
 * Extracts unique palier and specialités combinations from an Excel file
 * @param {string} filePath - Path to the Excel file
 * @returns {Array} Array of unique {palier, specialite} objects
 */
async function extractPalierAndSpecialities(filePath) {
  try {
    // Read the Excel file
    const buffer = await fs.readFile(filePath);
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    
    // Get the first worksheet
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Convert to JSON with raw: false to handle merged cells
    const rawData = xlsx.utils.sheet_to_json(worksheet, { raw: false });
    
    // Create a Set to store unique combinations of palier and specialité
    const uniqueCombinations = new Set();
    
    // Store the results
    const results = [];
    
    // Iterate through the data and extract palier and specialité
    for (const row of rawData) {
      // Skip the header row if it exists in the data
      if (row.palier === 'palier' || row.Palier === 'palier') continue;
      
      // Handle different possible column names (case sensitivity)
      const palier = row.palier || row.Palier;
      const specialite = row.specialités || row.Specialités || row.specialites || row.Specialites;
      
      // Skip if either is undefined
      if (!palier || !specialite) continue;
      
      // Create a unique key for this combination
      const key = `${palier}-${specialite}`;
      
      // Add to results if not already added
      if (!uniqueCombinations.has(key)) {
        uniqueCombinations.add(key);
        results.push({
          palier: palier,
          specialite: specialite
        });
      }
    }
    
    return {
      success: true,
      data: results
    };
  } catch (error) {
    console.error('Error extracting palier and specialities:', error);
    return {
      success: false,
      error: `Failed to extract data: ${error.message}`
    };
  }
}

/**
 * Example usage
 */
async function main() {
  try {
    const filePath = './faculty_info.xlsx'; // Replace with your file path
    const result = await extractPalierAndSpecialities(filePath);
    
    if (result.success) {
      console.log('Extracted Palier and Specialities:');
      console.table(result.data);
    } else {
      console.error(result.error);
    }
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// Uncomment to run
// main();

export default {
  extractPalierAndSpecialities
};