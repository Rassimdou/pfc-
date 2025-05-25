import json
import re
import sys
from typing import Dict, List, Any, Optional
import argparse
from pathlib import Path

try:
    import PyPDF2
    import pdfplumber
except ImportError:
    print("Required libraries not found. Please install them:")
    print("pip install PyPDF2 pdfplumber")
    sys.exit(1)


class UniversalScheduleExtractor:
    def __init__(self):
        self.time_slots_header = [
            "08:00-09:30",
            "09:40-11:10",
            "11:20-12:50",
            "13:00-14:30",
            "14:40-16:10",
            "16:20-17:50" # Added the last time slot
        ]
        self.days_full = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        self.day_mapping = {
            "sat": "Saturday", "sun": "Sunday", "mon": "Monday",
            "tue": "Tuesday", "wed": "Wednesday", "thu": "Thursday", "fri": "Friday"
        }
        self.time_slot_regex = r"(\d{2}:\d{2})-(\d{2}:\d{2})"

    def extract_text_from_pdf(self, pdf_path: str) -> str:
        try:
            with pdfplumber.open(pdf_path) as pdf:
                text = ""
                for page in pdf.pages:
                    page_text = page.extract_text(layout=True)
                    if page_text:
                        text += page_text + "\n"
                return text
        except Exception as e:
            print(f"Error with pdfplumber: {e}")
            return self._fallback_extraction(pdf_path)

    def _fallback_extraction(self, pdf_path: str) -> str:
        try:
            with open(pdf_path, 'rb') as file:
                return "\n".join(
                    page.extract_text().replace("\n", " ").strip()
                    for page in PyPDF2.PdfReader(file).pages
                    if page.extract_text()
                )
        except Exception as e:
            raise RuntimeError(f"PDF extraction failed: {e}")

    def parse_header(self, text: str) -> Dict[str, Any]:
        header = {
            "university": "University of Science and Technology Houari Boumediene",
            "vice_rectorate": "",
            "schedules_of": "",
            "college_year": "",
            "section": "",
            "semester": "",
            "date": ""
        }

        header["university"] = "University of Science and Technology Houari Boumediene"
        
        match = re.search(r"Vice-rectorate in charge of the higher education of graduation, the continuing education\s*et degrees", text, re.DOTALL)
        if match:
            header["vice_rectorate"] = re.sub(r'\s+', ' ', match.group(0)).strip()
        
        # Refined regex for 'schedules_of'
        match = re.search(r"Schedules of:\s*(.+?)(?=\s*College year:|Section:|Semester:|Date:|$)", text, re.IGNORECASE | re.DOTALL)
        if match:
            header["schedules_of"] = match.group(1).strip()
        
        match = re.search(r"College year:\s*(\d{4}/\d{4})", text)
        if match:
            header["college_year"] = match.group(1).strip()
        
        match = re.search(r"Section:\s*([A-Z])", text)
        if match:
            header["section"] = match.group(1).strip()
        
        match = re.search(r"Semester:\s*(\d+)", text)
        if match:
            header["semester"] = match.group(1).strip()
        
        match = re.search(r"Date:\s*(\d{1,2}/\d{1,2}/\d{4})", text)
        if match:
            header["date"] = match.group(1).strip()

        return header

    def _parse_single_session_block(self, block_text: str) -> List[Dict]:
        """
        Parses a single block of text representing one or more sessions within a time slot.
        """
        sessions = []
        
        # Split block_text by newlines first, then try the regex delimiter if no newlines
        lines = [line.strip() for line in block_text.split('\n') if line.strip()]
        
        sub_session_strings = []
        if lines:
            # If there are clear lines, treat each line as a potential session block
            sub_session_strings = lines
        else:
            # If no newlines, try splitting by specific session delimiters
            normalized_block_text = re.sub(r'\s+', ' ', block_text).strip()
            if not normalized_block_text:
                return []
            
            # Delimiter to identify start of new sessions within a concatenated string
            sub_session_delimiter_pattern = r"(?=\s*(G\d+(?::\d+)?(?:(?:\s*\/\s*)?)|Algorithmique|Génie logiciel|Système d\'Exploitation:|Fondements de l\'IA|Administration et Architecture|Techniques d\'Optimisation|Synchronisation course))"
            
            split_parts = re.split(sub_session_delimiter_pattern, normalized_block_text, flags=re.IGNORECASE)
            
            current_session_part = ""
            for i, part in enumerate(split_parts):
                if not part.strip():
                    continue
                # If it's a delimiter or a new session start
                # The regex for matching the delimiter itself for re-combining needs to be non-lookahead
                if re.match(sub_session_delimiter_pattern.replace('(?=', '^'), part, re.IGNORECASE):
                    if current_session_part:
                        sub_session_strings.append(current_session_part.strip())
                    current_session_part = part
                else:
                    current_session_part += part
            if current_session_part:
                sub_session_strings.append(current_session_part.strip())
            
            if not sub_session_strings and normalized_block_text:
                sub_session_strings = [normalized_block_text]
            elif not sub_session_strings:
                return []

        # Process each potential sub-session string
        for s_block in sub_session_strings:
            s_block = s_block.strip()
            if not s_block: continue

            session = {
                "group": None,
                "room": None,
                "course": None,
                "type": None,
                "professor": None
            }

            # Pattern 1: G<group>:<room> / <course> -- <type>, <professor> or G<group> / <course> -- <type>, <professor>
            match = re.match(r"(G\d+)(?::(\d+[A-Z]?))?\s*/\s*([A-Za-zÀ-ÿ’'\":,\-/\s]+?)\s*--\s*([A-Za-z]+)(?:,?\s*([A-Za-zÀ-ÿ\s-]+))?", s_block, re.UNICODE)
            if match:
                session["group"] = match.group(1).strip()
                session["room"] = match.group(2).strip() if match.group(2) else None
                session["course"] = match.group(3).strip()
                session["type"] = self._normalize_type(match.group(4))
                session["professor"] = match.group(5).strip() if match.group(5) else None
                sessions.append(session)
                continue

            # Pattern 2: <course> course <room/type> <professor>
            match = re.match(r"([A-Za-zÀ-ÿ’'\":,\-/\s]+?)\s*course\s*([A-Za-z0-9\.]+)?\s*([A-Za-zÀ-ÿ\s-]+)?", s_block, re.UNICODE)
            if match:
                session["course"] = match.group(1).strip()
                potential_type_room = match.group(2).strip() if match.group(2) else None
                professor = match.group(3).strip() if match.group(3) else None
                
                if potential_type_room:
                    if re.match(r'^\d+[A-Z]?$', potential_type_room):
                        session["room"] = potential_type_room
                    else:
                        session["type"] = self._normalize_type(potential_type_room)
                
                session["professor"] = professor
                session["type"] = session["type"] or self._normalize_type("C")
                sessions.append(session)
                continue

            # Pattern 3: <course>: <synchronization type> -- <type>, <professor>
            match = re.match(r"([A-Za-zÀ-ÿ’'\":,\-/\s]+?):\s*([A-Za-zÀ-ÿ’'\":,\-/\s]+?)\s*--\s*([A-Za-z]+)(?:,?\s*([A-Za-zÀ-ÿ\s-]+))?", s_block, re.UNICODE)
            if match:
                session["course"] = f"{match.group(1).strip()}: {match.group(2).strip()}"
                session["type"] = self._normalize_type(match.group(3))
                session["professor"] = match.group(4).strip() if match.group(4) else None
                sessions.append(session)
                continue
                
            # Pattern 4: Synchronisation course <type> <professor>
            match = re.match(r"(Synchronisation course)\s*([A-Za-z]+)\s*([A-Za-zÀ-ÿ\s-]+)?", s_block, re.UNICODE)
            if match:
                session["course"] = match.group(1).strip()
                session["type"] = self._normalize_type(match.group(2))
                session["professor"] = match.group(3).strip() if match.group(3) else None
                sessions.append(session)
                continue
            
            # Pattern 5: Course with only type/room and professor, potentially without explicit "course"
            match = re.match(r"([A-Za-zÀ-ÿ’'\":,\-/\s]+?)\s*([A-Za-z0-9\.]+)\s*([A-Za-zÀ-ÿ\s-]+)", s_block, re.UNICODE)
            if match:
                session["course"] = match.group(1).strip()
                potential_type_room = match.group(2).strip()
                professor = match.group(3).strip()

                if re.match(r'^\d+[A-Z]?$', potential_type_room):
                    session["room"] = potential_type_room
                    session["type"] = self._normalize_type("C")
                else:
                    session["type"] = self._normalize_type(potential_type_room)
                session["professor"] = professor
                sessions.append(session)
                continue

            # Fallback for remaining text if no specific pattern matches
            if not sessions and s_block:
                prof_match = re.search(r"([A-Z][a-zÀ-ÿ\s-]+)$", s_block)
                professor_fallback = prof_match.group(1).strip() if prof_match else None
                course_fallback = s_block
                if professor_fallback:
                    course_fallback = s_block.replace(professor_fallback, "").strip()
                
                course_fallback = re.sub(r'\s*--(DW|PW|C|SC|F|R2|T)\s*', '', course_fallback, flags=re.IGNORECASE).strip()
                course_fallback = re.sub(r'\s*course\s*', '', course_fallback, flags=re.IGNORECASE).strip()

                sessions.append({
                    "group": None,
                    "room": None,
                    "course": course_fallback if course_fallback else s_block,
                    "type": self._normalize_type("C"),
                    "professor": professor_fallback
                })

        return sessions

    def _normalize_type(self, code: Optional[str]) -> str:
        mapping = {
            "DW": "Directed Work",
            "PW": "Practical Work",
            "C": "Course",
            "SC": "Course",
            "F": "Course",
            "R2": "Course",
            "421T": "Course",
            "244T": "Course",
            "431T": "Course"
        }
        if code:
            normalized_code = code.upper().strip()
            return mapping.get(normalized_code, normalized_code)
        return ""

    def process_schedule(self, pdf_path: str) -> Dict[str, Any]:
        text = self.extract_text_from_pdf(pdf_path)
        print("\n--- Extracted Raw Text ---")
        print(text[:2000]) 
        print("--------------------------\n")

        header = self.parse_header(text)
        
        full_schedule_table = []
        with pdfplumber.open(pdf_path) as pdf:
            schedule_page = pdf.pages[0]

            table_settings = {
                "vertical_strategy": "lines",
                "horizontal_strategy": "lines",
                "snap_tolerance": 10, # Increased
                "join_tolerance": 10, # Increased
                "edge_min_length": 3,
                "text_tolerance": 5, # Increased
                "min_words_vertical": 0,
                "min_words_horizontal": 0,
                # Removed explicit_vertical_lines for auto-detection
            }
            
            tables = schedule_page.extract_tables(table_settings)
            if tables:
                full_schedule_table = tables[0]

        print("\n--- Extracted Table from pdfplumber (New Settings) ---")
        for row in full_schedule_table:
            print(row)
        print("-------------------------------------\n")

        schedule_data = self._process_extracted_table(full_schedule_table)
        
        final_time_slots = self.time_slots_header

        professors, subjects = self._analyze_entities(schedule_data)

        return {
            **header,
            "time_slots": final_time_slots,
            "professors": professors,
            "subjects": subjects,
            "weekly_schedule": schedule_data,
            "statistics": self._calculate_stats(schedule_data, professors, subjects)
        }

    def _process_extracted_table(self, table: List[List[Optional[str]]]) -> Dict[str, List[Dict]]:
        schedule: Dict[str, List[Dict]] = {day: [] for day in self.days_full}

        if not table or len(table) < 2:
            return schedule

        column_time_slots = self.time_slots_header 

        # This mapping is based on analysis of the `--- Extracted Table from pdfplumber ---` output
        # It assumes a fixed structure of fragmented cells as returned by pdfplumber with current settings.
        # Format: (pdfplumber_col_idx_part1, pdfplumber_col_idx_part2) or just pdfplumber_col_idx
        # For split cells, the order in the tuple matters for concatenation (part1, part2)
        time_slot_column_map = {
            0: 2, # 08:00-09:30 is at pdfplumber col 2
            1: 4, # 09:40-11:10 is at pdfplumber col 4
            2: (6, 7), # 11:20-12:50 is split between col 6 and 7
            3: (8, 9), # 13:00-14:30 is split between col 8 and 9 (e.g. 'Algorit', 'hmique')
            4: 11, # 14:40-16:10 is at pdfplumber col 11
            5: (12, 13) # 16:20-17:50 is split between col 12 and 13 (e.g. '16\n17', ':20\n-\n:50')
        }

        # Iterate through rows, starting from the first data row (after the header)
        for row_idx, row in enumerate(table[1:]):
            # Combine day cell content (e.g., 'Sa', 't')
            day_cell_content = ""
            if len(row) > 0 and row[0]:
                day_cell_content = row[0].strip()
            # Heuristic for fragmented day column (e.g., ['Sa', 't'])
            if len(row) > 1 and row[1] and len(day_cell_content) < 3 and len(row[1].strip()) < 3:
                day_cell_content += row[1].strip()
            
            normalized_day = None
            for abbr, full_day in self.day_mapping.items():
                if day_cell_content.lower().startswith(abbr.lower()):
                    normalized_day = full_day
                    break
            
            if not normalized_day:
                continue 

            day_sessions_for_consolidation: List[Dict] = []
            
            # Iterate through the predefined time slots and try to extract content
            for i, time_slot in enumerate(column_time_slots):
                cell_data = ""
                col_indices = time_slot_column_map.get(i)
                
                if isinstance(col_indices, tuple):
                    # Concatenate fragmented cells for this time slot
                    part1 = row[col_indices[0]].strip() if len(row) > col_indices[0] and row[col_indices[0]] else ""
                    part2 = row[col_indices[1]].strip() if len(row) > col_indices[1] and row[col_indices[1]] else ""
                    cell_data = (part1 + " " + part2).strip()
                elif col_indices is not None and len(row) > col_indices:
                    cell_data = row[col_indices].strip() if row[col_indices] else ""
                
                if cell_data:
                    parsed_sessions = self._parse_single_session_block(cell_data)
                    if parsed_sessions:
                        for session in parsed_sessions:
                            day_sessions_for_consolidation.append({
                                "time": time_slot,
                                "sessions": [session]
                            })
            
            consolidated_day_sessions: Dict[str, List[Dict[str, Any]]] = {}
            for session_item in day_sessions_for_consolidation:
                time_key = session_item['time']
                if time_key not in consolidated_day_sessions:
                    consolidated_day_sessions[time_key] = []
                consolidated_day_sessions[time_key].extend(session_item['sessions'])
            
            sorted_times = sorted(consolidated_day_sessions.keys(), 
                                  key=lambda t: column_time_slots.index(t) if t in column_time_slots else float('inf'))

            for t in sorted_times:
                schedule[normalized_day].append({
                    "time": t,
                    "sessions": consolidated_day_sessions[t]
                })

        return schedule

    def _analyze_entities(self, schedule: Dict) -> tuple:
        professors = {}
        subjects = {}

        for day_sessions in schedule.values():
            for slot in day_sessions:
                for session in slot["sessions"]:
                    subj = session["course"]
                    prof = session["professor"]

                    if subj:
                        subjects.setdefault(subj, {"name": subj, "professors": set(), "types": set()})
                        if prof:
                            subjects[subj]["professors"].add(prof)
                        if session["type"]:
                            subjects[subj]["types"].add(session["type"])

                    if prof:
                        professors.setdefault(prof, {"name": prof, "subjects": set()})
                        if subj:
                            professors[prof]["subjects"].add(subj)

        return (
            [{"name": k, "subjects": list(v["subjects"])} for k, v in professors.items()],
            [{"name": k, "professors": list(v["professors"]), "types": list(v["types"])} for k, v in subjects.items()]
        )

    def _calculate_stats(self, schedule: Dict, professors: List[Dict], subjects: List[Dict]) -> Dict:
        total_sessions = 0
        for day_sessions in schedule.values():
            for slot in day_sessions:
                total_sessions += len(slot["sessions"])
        
        return {
            "total_subjects": len(subjects),
            "total_professors": len(professors),
            "active_days": sum(1 for d_sessions in schedule.values() if d_sessions),
            "total_sessions": total_sessions
        }


def main():
    parser = argparse.ArgumentParser(description='Intelligent PDF Schedule Extractor')
    parser.add_argument('pdf_path', help='Path to PDF schedule')
    parser.add_argument('-o', '--output', help='Output JSON file')
    parser.add_argument('--pretty', action='store_true', help='Pretty-print JSON')

    args = parser.parse_args()

    if not Path(args.pdf_path).exists():
        sys.exit(f"Error: File {args.pdf_path} not found")

    try:
        extractor = UniversalScheduleExtractor()
        result = extractor.process_schedule(args.pdf_path)

        json_args = {'ensure_ascii': False}
        if args.pretty:
            json_args['indent'] = 2

        json_output = json.dumps(result, **json_args)

        if args.output:
            Path(args.output).write_text(json_output, encoding='utf-8')
            print(f"Saved to {args.output}")
        else:
            print(json_output)

    except Exception as e:
        sys.exit(f"Processing failed: {str(e)}")


if __name__ == "__main__":
    main()