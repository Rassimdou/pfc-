import sys
import json
import pdfplumber
import pandas as pd
import re
import requests
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def extract_schedule_data(pdf_path):
    try:
        with pdfplumber.open(pdf_path) as pdf:
            # Extract text from all pages
            text = ""
            for page in pdf.pages:
                text += page.extract_text() or ""

            # Initialize schedule data structure
            schedule_data = {
                "headerInfo": {
                    "university": "",
                    "speciality": "",
                    "section": "",
                    "academicYear": "",
                    "semester": "",
                    "date": "",
                    "groups": []
                },
                "timeSlots": [],
                "scheduleEntries": [],
                "rawContent": text
            }

            # Try regular extraction first
            try:
                # Extract header information
                lines = text.split('\n')
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue

                    # Extract university name
                    if "university" in line.lower() and not schedule_data["headerInfo"]["university"]:
                        schedule_data["headerInfo"]["university"] = line

                    # Extract speciality and section
                    speciality_match = re.search(r'Schedules of\s*:\s*(.+?)\s*--\s*Section:\s*([A-Z])', line, re.IGNORECASE)
                    if speciality_match:
                        schedule_data["headerInfo"]["speciality"] = speciality_match.group(1).strip()
                        schedule_data["headerInfo"]["section"] = speciality_match.group(2)

                    # Extract academic year
                    year_match = re.search(r'College year:\s*(\d{4}/\d{4})', line, re.IGNORECASE)
                    if year_match:
                        schedule_data["headerInfo"]["academicYear"] = year_match.group(1)

                    # Extract semester
                    semester_match = re.search(r'Semester:\s*(\d+)', line, re.IGNORECASE)
                    if semester_match:
                        schedule_data["headerInfo"]["semester"] = semester_match.group(1)

                    # Extract date
                    date_match = re.search(r'Date:\s*(\d{2}/\d{2}/\d{4})', line, re.IGNORECASE)
                    if date_match:
                        schedule_data["headerInfo"]["date"] = date_match.group(1)

                    # Extract groups
                    group_matches = re.findall(r'G(\d)', line)
                    for group in group_matches:
                        if group.isdigit() and 1 <= int(group) <= 9:
                            if int(group) not in schedule_data["headerInfo"]["groups"]:
                                schedule_data["headerInfo"]["groups"].append(int(group))

                # Sort groups
                schedule_data["headerInfo"]["groups"].sort()

                # Extract time slots and schedule entries
                current_day = None
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue

                    # Check if line contains time slots
                    if re.match(r'^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$', line):
                        if line not in schedule_data["timeSlots"]:
                            schedule_data["timeSlots"].append(line)

                    # Check if line contains a day
                    day_match = re.match(r'^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$', line, re.IGNORECASE)
                    if day_match:
                        current_day = day_match.group(1)
                        continue

                    # If we have a current day and the line contains course information
                    if current_day and re.search(r'[A-Z]+\d+', line):
                        entry = {
                            "day": current_day,
                            "timeSlot": schedule_data["timeSlots"][-1] if schedule_data["timeSlots"] else "",
                            "courseCode": re.search(r'[A-Z]+\d+', line).group(),
                            "courseName": line,
                            "groups": schedule_data["headerInfo"]["groups"]
                        }
                        schedule_data["scheduleEntries"].append(entry)

                # Check if we successfully extracted any data
                if not schedule_data["scheduleEntries"]:
                    raise Exception("No schedule entries found")

            except Exception as e:
                print(f"Regular extraction failed: {str(e)}")
                # If regular extraction fails, try Gemini API
                try:
                    # Call the Gemini API endpoint
                    response = requests.post(
                        f"{os.getenv('API_URL')}/api/schedule/extract-with-gemini",
                        json={"text": text}
                    )
                    
                    if response.status_code == 200:
                        gemini_data = response.json()
                        if gemini_data["success"]:
                            return gemini_data
                    
                    raise Exception("Gemini extraction failed")
                except Exception as gemini_error:
                    print(f"Gemini extraction failed: {str(gemini_error)}")
                    raise Exception("Both regular and Gemini extraction failed")

            return {
                "success": True,
                "data": schedule_data
            }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({
            "success": False,
            "error": "Usage: python extract_schedule_table.py <input_pdf_path> <output_json_path>"
        }))
        sys.exit(1)

    input_pdf = sys.argv[1]
    output_json = sys.argv[2]

    result = extract_schedule_data(input_pdf)
    
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2) 