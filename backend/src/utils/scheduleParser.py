import pdfplumber

def parse_schedule(file_path):
    echelude = {}
    
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            table = page.extract_table()            
            for line in lines:
                
                 
                 return echelude