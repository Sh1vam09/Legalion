# !pip install google-generativeai pypdf python-dotenv pandas matplotlib seaborn reportlab sentence-transformers faiss-cpu

import os
import json
import time
import functools
import logging
import hashlib
import pickle
import random
from collections import Counter
from typing import List, Dict, Any

import google.generativeai as genai
from google.api_core import exceptions
from google.api_core.exceptions import ResourceExhausted, ServiceUnavailable

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.colors import Color
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, FrameBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus.flowables import KeepTogether

# API key is NOT stored here. It is provided by the user at runtime via the frontend.
# Call configure_gemini_api(api_key) before using any Gemini API function.
API_KEY = None

def configure_gemini_api(api_key: str):
    """Configure the Gemini API with the user-provided key. Called before each pipeline run."""
    global API_KEY
    if not api_key or not api_key.strip():
        raise ValueError("A valid Gemini API key must be provided.")
    API_KEY = api_key.strip()
    genai.configure(api_key=API_KEY)

# --- Model & API Configuration ---
# Default model — overridden at runtime via set_model_name() from the frontend selection.
ALLOWED_MODELS = {"gemini-2.5-flash", "gemini-2.5-flash-lite"}
MODEL_NAME = "gemini-2.5-flash-lite"
MAX_API_RETRIES = 5
INITIAL_RETRY_DELAY = 5

def set_model_name(model: str):
    """Set the active Gemini model. Must be one of the ALLOWED_MODELS."""
    global MODEL_NAME
    if model not in ALLOWED_MODELS:
        raise ValueError(f"Model '{model}' is not allowed. Choose from: {ALLOWED_MODELS}")
    MODEL_NAME = model
    logging.info(f"Active Gemini model set to: {MODEL_NAME}")

# --- File Paths ---
PDF_FILE_PATH = "contract.pdf"
CLAUSES_JSON_OUTPUT = "clauses.json"
AMBIGUITY_JSON_OUTPUT = "ambiguity_analysis_strict.json"
FINAL_ANALYSIS_OUTPUT = "final_comprehensive_analysis.json"
PDF_REPORT_OUTPUT = "Contract_Decoder_Output.pdf"

# --- RAG Configuration (for Phase 3) ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

FAISS_INDEX_PATH = os.path.join(SCRIPT_DIR, "faiss_index.index")
METADATA_PATH = os.path.join(SCRIPT_DIR, "metadata.pkl")
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"

# --- Processing & Batching Limits ---
MAX_CHARS_PER_CHUNK = 150_000  # For initial clause segmentation
SAFE_ANALYSIS_CHAR_LIMIT = 80_000 # For ambiguity analysis
ITERATIVE_BATCH_CHAR_LIMIT = 20000 # Smaller limit for complex IREC analysis

# --- Gemini API Generation Settings ---
safety_settings = {
    'HARM_CATEGORY_HARASSMENT': 'BLOCK_NONE',
    'HARM_CATEGORY_HATE_SPEECH': 'BLOCK_NONE',
    'HARM_CATEGORY_SEXUALLY_EXPLICIT': 'BLOCK_NONE',
    'HARM_CATEGORY_DANGEROUS_CONTENT': 'BLOCK_NONE'
}

json_generation_config = genai.GenerationConfig(response_mime_type="application/json")

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def retry_with_exponential_backoff(
    func,
    max_retries=MAX_API_RETRIES,
    initial_delay=INITIAL_RETRY_DELAY,
    backoff_factor=2.0,
    retry_on_exceptions=(ResourceExhausted, ServiceUnavailable)
):
    """
    A decorator to retry a function with exponential backoff for specific API exceptions.
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        delay = initial_delay
        for i in range(max_retries):
            try:
                return func(*args, **kwargs)
            except retry_on_exceptions as e:
                if i == max_retries - 1:
                    print(f"  -> FATAL: API call failed after {max_retries} retries. Raising final exception.")
                    raise
                
                print(f"  -> API Error: {type(e).__name__}. Retrying in {delay:.1f} seconds... (Attempt {i+1}/{max_retries})")
                time.sleep(delay)
                delay *= backoff_factor
    return wrapper

class RateLimiter:
    """A simple class to manage API rate limiting."""
    def __init__(self, max_requests, per_seconds):
        self.max_requests = max_requests
        self.per_seconds = per_seconds
        self.requests = []

    def wait(self):
        """Waits if the number of recent requests exceeds the limit."""
        now = time.time()
        self.requests = [r for r in self.requests if now - r < self.per_seconds]
        if len(self.requests) >= self.max_requests:
            sleep_time = self.per_seconds - (now - self.requests[0])
            if sleep_time > 0:
                logging.info(f"Rate limit hit ({self.max_requests} RPM). Proactively waiting for {sleep_time:.2f} seconds.")
                time.sleep(sleep_time)
        self.requests.append(time.time())

# ADD THIS NEW FUNCTION TO notebook_module.py
@retry_with_exponential_backoff
def extract_text_from_pdf(pdf_file_path: str) -> str:
    '''Extracts all text from a PDF file using the Gemini API.Args:'''
    try:
        # Upload the file to the Gemini API
        # Using a display_name allows you to refer to it later in the console if needed
        contract_file = genai.upload_file(path=pdf_file_path, display_name=os.path.basename(pdf_file_path))
        print(f"Uploaded file '{pdf_file_path}' to Gemini API.")
        
        # Create a model instance for text extraction
        model = genai.GenerativeModel(MODEL_NAME)
        
        # Prompt the model to extract all text
        response = model.generate_content([
            contract_file,
            "Extract all text from this PDF, preserving all original text, paragraphs, and formatting as closely as possible."
        ])
        
        # Delete the file from Gemini API after extraction to manage resources
        genai.delete_file(contract_file.name)
        print(f"Deleted file '{contract_file.display_name}' from Gemini API.")
        
        return response.text
    except FileNotFoundError:
        raise FileNotFoundError(f"Error: The PDF file '{pdf_file_path}' was not found.")
    except exceptions.GoogleAPIError as e:
        # Catch specific Google API errors for better debugging
        logging.error(f"Gemini API error during text extraction: {e}")
        raise
    except Exception as e:
        logging.error(f"An unexpected error occurred during Gemini PDF text extraction: {e}")
        raise


@retry_with_exponential_backoff
def get_text_with_boundaries(text_batch: str) -> str:
    """
    Makes a call to the Gemini API to insert clause boundaries, aiming for perfect, atomic legal provisions.
    """
    model = genai.GenerativeModel(MODEL_NAME)
    
    prompt = f"""
    Your task is to act as an expert paralegal. You will analyze the following legal contract text and insert a boundary marker, [--CLAUSE-BREAK--], to delineate complete, atomic legal provisions smartly dynamically and intelligently. The goal is to achieve perfect segmentation, where each segment represents a distinct rule, declaration, or condition. Remember that the clauses must be atomic, even if they are more in number that's fine, this is the first priority.

    **Core Directive: Think in terms of "provisions," not "sentences."**

    RULES FOR PERFECT SEGMENTATION:
    1.  **DO NOT SPLIT PARAGRAPHS:** A single paragraph that describes one coherent rule or condition is a single clause. Do not insert markers in the middle of a paragraph. A single sentence is almost never a complete clause by itself.
    2.  **GROUP SUB-LISTS:** You MUST group related sub-points (e.g., (a), (b), (c) or (i), (ii), (iii)) under their introductory sentence. The entire list and its introduction constitute a single, atomic clause.
    3.  **IDENTIFY TRUE SEMANTIC SHIFTS:** Place a marker ONLY when the topic fundamentally changes.
        -   **Strong Indicators for a new clause:** A new major article number (e.g., "10. GOVERNING LAW", "11. NOTICES"), a "WHEREAS" preamble, or a shift from one party's obligations to another's.
        -   **Weak Indicators (Do NOT use for new clauses):** A new sentence within the same paragraph, a transition word (e.g., "However," "Furthermore").
    4.  **PRESERVE ALL TEXT:** The output must be the complete, dont even skip a single letter or word, everything must necessarily be there, original text with the markers inserted. Do not summarize, change, or remove any text.

    ---
    **Contract Text Portion to Process:**
    ---
    {text_batch}
    ---
    """
    
    response = model.generate_content(prompt, safety_settings=safety_settings)
    return response.text

def process_text_to_clauses(contract_text: str) -> list[dict]:
    """Chunks the contract text and uses an LLM to segment it into clauses."""
    if not contract_text or not contract_text.strip():
        print("Input text is empty. Cannot process clauses.")
        return []

    text_chunks = [
        contract_text[i:i + MAX_CHARS_PER_CHUNK] 
        for i in range(0, len(contract_text), MAX_CHARS_PER_CHUNK)
    ]
    print(f"Contract text divided into {len(text_chunks)} chunk(s) for segmentation.")

    all_marked_up_text = ""
    for i, chunk in enumerate(text_chunks):
        print(f"Processing chunk {i+1} of {len(text_chunks)}...")
        if chunk.strip():
            marked_text = get_text_with_boundaries(chunk)
            if marked_text:
                all_marked_up_text += marked_text
            else:
                print(f"  -> Warning: Received empty response for chunk {i+1}. It may be skipped.")
    
    raw_clauses = all_marked_up_text.split('[--CLAUSE-BREAK--]')
    
    final_clauses = []
    clause_counter = 1
    for clause_text in raw_clauses:
        clean_text = clause_text.strip()
        if clean_text:
            final_clauses.append({'clause_number': clause_counter, 'content': clean_text})
            clause_counter += 1
            
    return final_clauses

# --- Execute Phase 1 --- 
# This block will now be managed by the FastAPI app
# if full_contract_text:
#     print(f"\nAnalyzing extracted text to identify atomic legal provisions...")
#     final_clauses = process_text_to_clauses(full_contract_text)

#     if not final_clauses:
#         print("\nProcessing finished, but no valid clauses were extracted.")
#     else:
#         print(f"\nSuccessfully extracted {len(final_clauses)} clauses. Saving to JSON...")
#         with open(CLAUSES_JSON_OUTPUT, "w", encoding="utf-8") as f:
#             json.dump(final_clauses, f, indent=2, ensure_ascii=False)
#         print(f"Processing complete. All clauses saved to '{CLAUSES_JSON_OUTPUT}'.")
# else:
#     print("\nSkipping clause segmentation because PDF text extraction failed.")

@retry_with_exponential_backoff
def get_strict_ambiguity_analysis_for_batch(clause_batch: list[dict]) -> list[dict]:
    """Sends a batch of clauses to the Gemini API for a stricter ambiguity analysis."""
    model = genai.GenerativeModel(MODEL_NAME)
    
    prompt = f"""
    You are an expert legal analyst with a highly skeptical and risk-averse perspective. Your primary goal is to identify *any* potential for future disputes in the provided legal clauses, no matter how small. Assume a worst-case scenario where one party will try to exploit any loophole.

    For EACH clause in the input array, you must perform a detailed analysis and return a corresponding JSON object.

    RULES FOR STRICTER ANALYSIS:
    1.  **ambiguity_level**: Assign a risk level based on these stricter definitions: "None", "Low", "Medium", or "High".
        - "None": Reserved ONLY for purely definitional clauses with no operational effect.
        - "Low": Applies to any clause containing standard legal jargon (e.g., 'best knowledge', 'indemnify') or references to external documents (e.g., 'as per Annexure A').
        - "Medium": Applies to any operational clause that describes a duty or condition without a precise, objective, or measurable metric (e.g., 'reasonable time', 'promptly', 'heavy repairs').
        - "High": Applies to any clause that grants unilateral discretionary power (e.g., 'as the Developer deems fit'), creates a collective punishment risk, or uses dangerously vague terms to define performance (e.g., 'any kind of hindrance').
    2.  **ambiguous_phrases**: Create a JSON list of the exact words or phrases that are vague or subjective. If none, return an empty list [].
    3.  **analysis**: Explain PRECISELY WHY the identified phrases are ambiguous or how the clause structure creates uncertainty.

    The output MUST be a valid JSON array, where each object corresponds to an input clause and strictly follows this structure:
    {{
      "clause_number": <number>,
      "ambiguity_level": "<string>",
      "ambiguous_phrases": ["<string>", "..."],
      "analysis": "<string>"
    }}

    Here is the JSON array of clauses to analyze:
    ---
    {json.dumps(clause_batch, indent=2)}
    ---
    """
    
    response = model.generate_content(prompt, generation_config=json_generation_config, safety_settings=safety_settings)
    return json.loads(response.text)

def run_strict_analysis(input_path: str, output_path: str):
    """Orchestrates the ambiguity analysis of clauses using dynamic, size-based batching."""
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            clauses = json.load(f)
    except FileNotFoundError:
        print(f"ERROR: The input file '{input_path}' was not found. Cannot run ambiguity analysis.")
        return
    except json.JSONDecodeError:
        print(f"ERROR: The input file '{input_path}' is not a valid JSON file.")
        return

    print(f"Loaded {len(clauses)} clauses from '{input_path}'.")
    
    all_analyzed_clauses = []
    current_batch = []
    current_batch_chars = 0
    
    for clause in clauses:
        clause_chars = len(clause.get('content', ''))
        
        if current_batch and (current_batch_chars + clause_chars > SAFE_ANALYSIS_CHAR_LIMIT):
            print(f"  - Processing dynamic analysis batch of {len(current_batch)} clauses ({current_batch_chars} chars)...")
            try:
                analysis_results = get_strict_ambiguity_analysis_for_batch(current_batch)
                all_analyzed_clauses.extend(analysis_results)
            except Exception as e:
                print(f"  -> FATAL: Failed to process a batch. Error: {e}. Aborting analysis.")
                break
            
            current_batch = [clause]
            current_batch_chars = clause_chars
        else:
            current_batch.append(clause)
            current_batch_chars += clause_chars

    if current_batch:
        print(f"  - Processing final analysis batch of {len(current_batch)} clauses ({current_batch_chars} chars)...")
        try:
            analysis_results = get_strict_ambiguity_analysis_for_batch(current_batch)
            all_analyzed_clauses.extend(analysis_results)
        except Exception as e:
            print(f"  -> FATAL: Failed to process the final batch. Error: {e}.")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_analyzed_clauses, f, indent=2, ensure_ascii=False)
    
    print(f"\nAnalysis complete. {len(all_analyzed_clauses)} clauses analyzed.")
    print(f"Full ambiguity analysis saved to '{output_path}'.")

# --- Execute Phase 2 ---
# This block will now be managed by the FastAPI app
# print(f"--- Starting Stricter Ambiguity Analysis on '{CLAUSES_JSON_OUTPUT}' ---")
# run_strict_analysis(CLAUSES_JSON_OUTPUT, AMBIGUITY_JSON_OUTPUT)

faiss_index = None
metadata = None
embedding_model = None

def load_rag_components():
    """Loads the FAISS index, metadata, and sentence transformer model into memory."""
    global faiss_index, metadata, embedding_model
    try:
        import faiss
        from sentence_transformers import SentenceTransformer

        if faiss_index is None:
            logging.info(f"Loading FAISS index from {FAISS_INDEX_PATH}")
            faiss_index = faiss.read_index(FAISS_INDEX_PATH)
        if metadata is None:
            logging.info(f"Loading metadata from {METADATA_PATH}")
            with open(METADATA_PATH, 'rb') as f:
                metadata = pickle.load(f)
        if embedding_model is None:
            logging.info(f"Loading sentence transformer model: {EMBEDDING_MODEL_NAME}")
            embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        return True
    except FileNotFoundError as e:
        logging.warning(f"RAG component file not found: {e}. RAG context will be disabled.")
        return False
    except Exception as e:
        logging.error(f"An error occurred while loading RAG components: {e}")
        return False

def retrieve_legal_context(text: str, top_k: int = 3) -> str:
    """Retrieves relevant legal context for a given text using the RAG system."""
    if not all([faiss_index, metadata, embedding_model]):
        return "(RAG components not available)"
    
    query_embedding = embedding_model.encode([text], normalize_embeddings=True).astype('float32')
    D, I = faiss_index.search(query_embedding, top_k)

    results = []
    for idx in I[0]:
        if 0 <= idx < len(metadata):
            item = metadata[idx]
            text_snippet = item.get("text", "")
            law_source = item.get("source", "Unknown Source")
            section = item.get("section", "Unknown Section")
            results.append(f"[{law_source} - {section}]\n{text_snippet}")

    return "\n\n".join(results) if results else "(No relevant legal context found)"

def get_initial_systemic_analysis(all_clauses: List[Dict[str, Any]], limiter: RateLimiter) -> List[Dict]:
    """Analyzes the entire document for inter-clause risks, focusing on exploitable conflicts."""
    full_document_text = "\n\n".join([f"--- CLAUSE {c['clause_number']} ---\n{c['content']}" for c in all_clauses])
    
    prompt = f"""
    You are a senior risk strategist advising a Society against a Developer. Your task is to find **inter-clause conflicts** that the Developer can exploit.
    
    **Mandatory Conflict Checks:**
    1.  **Contradictory Obligations:** Find where one clause gives the Developer a right or discretion that undermines an obligation they have in another clause.
    2.  **Timeline Gaps:** Identify where an obligation (e.g., payment) is due, but the trigger for that obligation (e.g., a completion milestone) is vaguely defined in another clause, allowing the Developer to control the timing.
    3.  **Compounding Risks:** Look for instances where a minor ambiguity in one clause, when combined with a vague condition in another, creates a significant, exploitable loophole for the Developer.
    
    **Reporting Directive:**
    Your output must be a single, valid JSON list. For each conflict you find, provide an object with this schema:
    `{{"risk_type": "e.g., Obligation Conflict, Timeline Loophole", "involved_clauses": ["clause_num_1", "clause_num_2"], "description": "A plain-English explanation of how the Developer can exploit the conflict between these clauses."}}`
    
    --- DOCUMENT FOR AUDIT ---
    {full_document_text}
    """
    response = call_gemini_api(prompt, limiter, use_json_mode=True)
    try: return json.loads(response)
    except json.JSONDecodeError:
        logging.error(f"  - Failed to decode JSON for initial systemic analysis. Response: {response[:500]}"); return []

def get_iterative_analysis(batch: List[Dict[str, Any]], all_clauses_text: str, limiter: RateLimiter) -> List[Dict]:
    """Gets loophole analysis for a batch, focusing on how the Developer can exploit the wording."""
    batch_data = [{
        "clause_number": c["clause_number"], "content": c["content"],
        "ambiguities": c.get("ambiguities", []), "related_systemic_risks": c.get("related_systemic_risks", []),
        "short_loopholes": c.get("short_loopholes", [])
    } for c in batch]
    
    for i, c in enumerate(batch):
        # RAG context is retrieved but used internally by the model for awareness, not for direct quoting.
        rag_context = retrieve_legal_context(c["content"])
        batch_data[i]["relevant_laws"] = rag_context
        
    prompt = f"""
    You are an adversarial strategist. For EACH clause in the `Clauses_To_Analyze` list, your goal is to find new, exploitable loopholes for the Developer.You must consider the `Full Document Context` and any previously found risks.
    Even if a clause appears to be a short or factual-looking sentence, you must still examine it for hidden obligations or timelines. Clauses containing words like or similar to  "shall", "must", "agreed", "obliged", "subject to", or "within X months" often indicate binding commitments or deadlines that can be exploited—even if they appear neutral or descriptive at first glance.
    Do not skip clauses just because they seem short or simple. Many serious risks hide inside seemingly harmless clauses.
    **Reasoning Process:**
    1.  **Identify the Clause's Purpose:** What is this clause supposed to protect or guarantee for the Society?
    2.  **Find the Weakness:** How can the Developer use the specific wording (or lack of specific wording) to undermine that purpose?
    3.  **Check for Mitigations:** Does any other clause in the `Full Document Context` close this loophole? If not, it's a valid risk.
    
    **Output Instructions:**
    Return a single, valid JSON list. Each object must have the schema: `{{"clause_number": "string", "analysis_result": [ ... new loophole objects ... ]}}`.
    If a clause has NO new net loopholes after considering all context, its `analysis_result` MUST be an EMPTY LIST `[]`.
    
    **Loophole Object Schema:** `{{"short_desc": "A brief, direct summary of the loophole.", "loophole_type": "e.g., Financial Risk, Timeline Risk, Discretionary Power", "risk_level": "High/Medium/Low", "impact_on": "The Society's finances, timelines, etc."}}`.
    
    --- CONTEXT FOR ANALYSIS ---
    **Full Document Context:**
    ```text
    {all_clauses_text}
    ```
    **Clauses_To_Analyze:**
    {json.dumps(batch_data, indent=2)}
    """
    response = call_gemini_api(prompt, limiter, use_json_mode=True)
    try: return json.loads(response)
    except json.JSONDecodeError:
        logging.error(f"  - Failed to decode JSON for iterative batch. Response: {response[:500]}"); return []

def get_final_summary(batch: List[Dict[str, Any]], limiter: RateLimiter) -> List[Dict]:
    """Generates the final, hard-hitting risk summary for each clause."""
    batch_data = [{
        "clause_number": c["clause_number"], "content": c["content"], "ambiguities": c.get("ambiguities", []),
        "related_systemic_risks": c.get("related_systemic_risks", []), "short_loopholes": c.get("short_loopholes", [])
    } for c in batch]

    prompt = f"""
    You are a senior risk consultant advising a Society. Your sole job is to explain, in plain, direct English, how each clause can be used against them. For each clause provided, you must generate a final analysis.
    
    **Instructions for the `final_analysis_summary`:**
    - Synthesize all identified risks for the clause into a single, cohesive, and hard-hitting paragraph.
    - The paragraph must seamlessly weave together three key elements: 
      1. The core problem or loophole.
      2. How the Developer can strategically exploit it.
      3. The direct financial and operational impact on the Society.
    - Do NOT use bullet points, numbered lists, or section headers like 'Core Loophole:'.
    - The tone should be direct, professional, and consultative. Focus on how the clause can be weaponized.
    
    **Example of a good summary:**
    "A critical risk arises from the lack of a provision for an independent, third-party auditor funded by the Developer. This absence of oversight gives the Developer a clear opportunity to cut corners on materials and workmanship to increase their profits, knowing that any defects or deviations from the approved plans may not be discovered until long after they have left the project. Ultimately, this shifts the entire risk of a poorly constructed building onto the Society, who will be solely responsible for substantial future repair costs, potential safety hazards, and the financial burden of a property with a reduced lifespan."
    
    **Output Rules:**
    - Based on your analysis, assign an `overall_risk_level` of "High", "Medium", or "Low".
    - Return a single, valid JSON list of objects. Each object must strictly adhere to this schema:
    `{{"clause_number": "string", "final_analysis_summary": "The single, cohesive risk paragraph.", "overall_risk_level": "High/Medium/Low"}}`
    
    --- Input Clauses for Final Synthesis ---
    {json.dumps(batch_data, indent=2)}
    """
    response = call_gemini_api(prompt, limiter, use_json_mode=True)
    try: return json.loads(response)
    except json.JSONDecodeError:
        logging.error(f"  - Failed to decode JSON for final summary batch. Response: {response[:500]}"); return []

def _generate_loophole_fingerprint(loophole: Dict) -> str:
    """Creates a stable, normalized fingerprint for a loophole to detect semantic duplicates."""
    desc = str(loophole.get("short_desc", "")).lower().strip()
    l_type = str(loophole.get("loophole_type", "")).lower().strip()
    for punc in ['.', ',', ';', ':', '!', '?']:
        desc = desc.replace(punc, "")
        l_type = l_type.replace(punc, "")
    fingerprint_str = f"desc:{desc}|type:{l_type}"
    return hashlib.md5(fingerprint_str.encode()).hexdigest()

class RateLimiter:
    """A simple class to manage API rate limiting."""
    def __init__(self, max_requests, per_seconds):
        self.max_requests = max_requests
        self.per_seconds = per_seconds
        self.requests = []

    def wait(self):
        """Waits if the number of recent requests exceeds the limit."""
        now = time.time()
        self.requests = [r for r in self.requests if now - r < self.per_seconds]
        if len(self.requests) >= self.max_requests:
            sleep_time = self.per_seconds - (now - self.requests[0])
            if sleep_time > 0:
                logging.info(f"Rate limit hit ({self.max_requests} RPM). Proactively waiting for {sleep_time:.2f} seconds.")
                time.sleep(sleep_time)
        self.requests.append(time.time())

def create_dynamic_batches(clauses: List[Dict[str, Any]], char_limit: int) -> List[List[Dict[str, Any]]]:
    """Creates dynamic batches based on character length, handling non-serializable types."""
    if not clauses: return []
    batches, current_batch, current_char_count = [], [], 0
    for clause in clauses:
        sanitized_clause = clause.copy()
        sanitized_clause.pop('loophole_fingerprints', None)
        clause_char_count = len(json.dumps(sanitized_clause))
        if current_batch and (current_char_count + clause_char_count > char_limit):
            batches.append(current_batch)
            current_batch, current_char_count = [], 0
        current_batch.append(clause)
        current_char_count += clause_char_count
    if current_batch: batches.append(current_batch)
    return batches

def call_gemini_api(prompt: str, limiter: RateLimiter, use_json_mode: bool = True) -> str:
    """Calls the Gemini API synchronously with rate limiting and retry logic."""
    limiter.wait()
    model = genai.GenerativeModel(MODEL_NAME)
    config = json_generation_config if use_json_mode else None
    for attempt in range(MAX_API_RETRIES):
        try:
            logging.info(f"  - Sending prompt to API (Attempt {attempt + 1}/{MAX_API_RETRIES})...")
            response = model.generate_content(prompt, generation_config=config, safety_settings=safety_settings)
            logging.info("  - API call successful.")
            return response.text
        except (exceptions.ResourceExhausted, exceptions.DeadlineExceeded, exceptions.ServiceUnavailable, exceptions.TooManyRequests) as e:
            logging.warning(f"  - API Error: {type(e).__name__}. Waiting {INITIAL_RETRY_DELAY}s before retrying.")
            if attempt < MAX_API_RETRIES - 1: time.sleep(INITIAL_RETRY_DELAY)
            else: logging.error(f"  - API call failed after {MAX_API_RETRIES} attempts."); return "[]"
        except Exception as e:
            logging.error(f"  - Unhandled API error: {type(e).__name__}: {e}. Stopping retries."); return "[]"
    return "[]"

# Colour palette for detected parties (cycles if more than 6 parties found)
PARTY_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#06b6d4"]

def extract_contract_parties(all_clauses: List[Dict[str, Any]], limiter: RateLimiter) -> List[Dict]:
    """
    Uses Gemini to dynamically detect the main contracting parties from the clause text.
    Returns a list of dicts: [{"name": "...", "obligation_keywords": [...]}]
    Falls back to generic Party A / Party B on failure.
    """
    # Sample the first ~30 clauses to keep the prompt manageable
    sample_text = "\n\n".join([
        f"--- CLAUSE {c['clause_number']} ---\n{c['content']}"
        for c in all_clauses[:30]
    ])

    prompt = f"""
You are a legal document analyst. Read the following contract clause samples and identify the main contracting parties (typically 2–4 distinct entities such as Employer, Employee, Developer, Society, Vendor, Client, Lessor, Lessee, etc.).

For each party you detect, provide:
1. A short, clean display name (e.g. "Developer", "Society", "Employer", "Employee").
2. A list of exact lowercase obligation-trigger phrases that appear in the text, showing that party has a duty (e.g. "developer shall", "employer must", "society agrees").

Return ONLY a valid JSON array. No extra text, no markdown. Each element must follow this schema exactly:
[{{"name": "PartyName", "obligation_keywords": ["party shall", "party will", "party must", "party agrees"]}}]

--- CONTRACT CLAUSES SAMPLE ---
{sample_text}
---
"""
    logging.info("  - Detecting contracting parties from clause text...")
    response = call_gemini_api(prompt, limiter, use_json_mode=True)
    try:
        parties = json.loads(response)
        if isinstance(parties, list) and len(parties) > 0:
            logging.info(f"  - Detected parties: {[p.get('name') for p in parties]}")
            return parties
    except (json.JSONDecodeError, TypeError):
        logging.error("  - Failed to parse party extraction response. Using fallback defaults.")

    # Fallback — generic two-party contract
    return [
        {"name": "Party A", "obligation_keywords": ["party a shall", "party a will", "party a must", "party a agrees"]},
        {"name": "Party B", "obligation_keywords": ["party b shall", "party b will", "party b must", "party b agrees"]},
    ]

def generate_knowledge_graph_data(
    systemic_risks: List[Dict],
    clause_analysis: List[Dict],
    parties: List[Dict],
) -> Dict:
    """Transforms analysis results into a Knowledge Graph format for visualization.
    
    Uses the dynamically detected `parties` list so any contract type is supported.
    """
    # Build entity nodes from the detected parties
    nodes = []
    for i, party in enumerate(parties):
        nodes.append({
            "id": party["name"],
            "label": party["name"],
            "group": "Entity",
            "color": PARTY_COLORS[i % len(PARTY_COLORS)],
            "val": 15,
        })

    links = []

    risk_config = {
        "High":         {"color": "#ff4d4d", "val": 12},
        "Medium":       {"color": "#fbbf24", "val": 10},
        "Low":          {"color": "#34d399", "val": 8},
        "Not Assessed": {"color": "#94a3b8", "val": 5},
    }

    for idx, clause in enumerate(clause_analysis):
        c_num = str(clause.get("clause_number", ""))
        if not c_num:
            c_num = f"unknown_{idx}"
        risk_level = clause.get("overall_risk_level", "Not Assessed")
        config = risk_config.get(risk_level, risk_config["Not Assessed"])

        nodes.append({
            "id": c_num,
            "label": f"Clause {c_num}",
            "group": "Clause",
            "val": config["val"],
            "color": config["color"],
        })

        # Draw obligation links for each detected party dynamically
        content = clause.get("content", "").lower()
        for party in parties:
            keywords = party.get("obligation_keywords", [])
            if any(kw.lower() in content for kw in keywords):
                links.append({
                    "source": party["name"],
                    "target": c_num,
                    "label": "Obligation",
                    "type": "Obligation",
                })

    # Draw conflict links between clauses that share a systemic risk
    for risk in systemic_risks:
        involved = [str(c) for c in risk.get("involved_clauses", [])]
        risk_type = risk.get("risk_type", "Conflict")
        for i in range(len(involved)):
            for j in range(i + 1, len(involved)):
                links.append({
                    "source": involved[i],
                    "target": involved[j],
                    "label": risk_type,
                    "type": risk_type,
                })

    return {"nodes": nodes, "links": links}

def load_and_prepare_data() -> Dict[str, Dict[str, Any]]:
    """Loads and merges data from previous phases, preparing all fields for the pipeline."""
    logging.info("Loading and preparing data for deep analysis...")
    try:
        with open(CLAUSES_JSON_OUTPUT, 'r', encoding='utf-8') as f:
            clauses_list = json.load(f)
        with open(AMBIGUITY_JSON_OUTPUT, 'r', encoding='utf-8') as f:
            ambiguities_list = json.load(f)
    except FileNotFoundError as e:
        raise SystemExit(f"FATAL: Input file not found - {e.filename}. Cannot proceed with deep analysis.")

    analysis_data = {str(c["clause_number"]): c for c in clauses_list}
    for item in ambiguities_list:
        clause_num = str(item.get("clause_number"))
        if clause_num in analysis_data:
            analysis_data[clause_num]["ambiguities"] = item.get("ambiguous_phrases", [])

    for data in analysis_data.values():
        data.setdefault("ambiguities", [])
        data.setdefault("related_systemic_risks", []) 
        data.setdefault("short_loopholes", [])
        data.setdefault("is_converged", False)
        data.setdefault("iteration_count", 0)
        data.setdefault("final_analysis_summary", "")
        data.setdefault("overall_risk_level", "Not Assessed")
        data.setdefault("loophole_fingerprints", set())

    logging.info(f"Prepared {len(analysis_data)} clauses for analysis.")
    return analysis_data

def run_analysis_pipeline(analysis_data: Dict[str, Dict[str, Any]]):
    """Orchestrates the re-ordered, multi-phase analysis with enhanced logic."""
    MAX_ITERATIONS = 5
    REQUESTS_PER_MINUTE_LIMIT = 15
    limiter = RateLimiter(max_requests=REQUESTS_PER_MINUTE_LIMIT, per_seconds=60)
    all_clauses = list(analysis_data.values())
    all_clauses_text = "\n\n".join([f"--- CLAUSE {c['clause_number']} ---\n{c['content']}" for c in all_clauses])

    logging.info("\n--- Starting Phase 3.1: Initial Systemic Risk Analysis (Full Document) ---")
    initial_systemic_risks = get_initial_systemic_analysis(all_clauses, limiter)
    if initial_systemic_risks:
        logging.info(f"Found {len(initial_systemic_risks)} initial systemic risk(s). Mapping to clauses...")
        for risk in initial_systemic_risks:
            involved_clauses = risk.get("involved_clauses", [])
            risk_summary = f"Systemic Risk ('{risk.get('risk_type')}'): {risk.get('description')}"
            for clause_num in involved_clauses:
                if str(clause_num) in analysis_data:
                    analysis_data[str(clause_num)]["related_systemic_risks"].append(risk_summary)
        logging.info("  - Mapping complete.")
    else:
        logging.warning("Warning: No initial systemic risks were found. This is unusual for a complex document.")

    for clause_data in analysis_data.values():
        clause_data['loophole_fingerprints'] = {_generate_loophole_fingerprint(lh) for lh in clause_data['short_loopholes']}

    logging.info("\n--- Starting Phase 3.2: Iterative Loophole Discovery ---")
    for iteration in range(1, MAX_ITERATIONS + 1):
        clauses_to_process = [data for data in analysis_data.values() if not data['is_converged']]
        if not clauses_to_process:
            logging.info("\n>>> All clauses have converged. Moving to final summary. <<<")
            break

        logging.info(f"\n--- Iteration {iteration} | Clauses to process: {len(clauses_to_process)} ---")
        batches = create_dynamic_batches(clauses_to_process, ITERATIVE_BATCH_CHAR_LIMIT)
        logging.info(f"Created {len(batches)} batches for this iteration.")

        for i, batch in enumerate(batches):
            logging.info(f"  Processing iterative batch {i+1}/{len(batches)}...")
            batch_results = get_iterative_analysis(batch, all_clauses_text, limiter)
            
            for result_item in batch_results:
                clause_num = str(result_item.get("clause_number")).strip()
                if clause_num not in analysis_data: continue

                clause_data = analysis_data[clause_num]
                newly_found_loopholes = result_item.get("analysis_result", [])
                
                genuinely_new_count = 0
                for new_loophole in newly_found_loopholes:
                    fingerprint = _generate_loophole_fingerprint(new_loophole)
                    if fingerprint not in clause_data['loophole_fingerprints']:
                        clause_data['loophole_fingerprints'].add(fingerprint)
                        clause_data['short_loopholes'].append(new_loophole)
                        genuinely_new_count += 1
                
                clause_data["iteration_count"] = iteration
                if genuinely_new_count == 0:
                    clause_data["is_converged"] = True
                    logging.info(f"    -> Clause '{clause_num}' has converged. No new unique loopholes found.")
                else:
                    clause_data['is_converged'] = False
                    logging.info(f"    -> Found {genuinely_new_count} new unique loophole(s) for Clause '{clause_num}'.")
    else:
        logging.warning(f"\nWarning: Reached max iterations ({MAX_ITERATIONS}). Some clauses may not have converged.")

    logging.info("\n--- Starting Phase 3.3: Final Comprehensive Summary Generation ---")
    summary_batches = create_dynamic_batches(all_clauses, ITERATIVE_BATCH_CHAR_LIMIT)
    for i, batch in enumerate(summary_batches):
        logging.info(f"  Generating final summaries for batch {i+1}/{len(summary_batches)}...")
        final_summaries = get_final_summary(batch, limiter)
        for summary_item in final_summaries:
            clause_num = str(summary_item.get("clause_number")).strip()
            if clause_num in analysis_data:
                analysis_data[clause_num]["final_analysis_summary"] = summary_item.get("final_analysis_summary", "Error generating summary.")
                analysis_data[clause_num]["overall_risk_level"] = summary_item.get("overall_risk_level", "Error")

    for data in analysis_data.values():
        if 'loophole_fingerprints' in data:
            del data['loophole_fingerprints']

    logging.info("\n--- Starting Phase 3.4: Dynamic Party Detection for Knowledge Graph ---")
    detected_parties = extract_contract_parties(all_clauses, limiter)
    logging.info(f"  - Using {len(detected_parties)} detected parties for graph: {[p['name'] for p in detected_parties]}")

    final_output = {
        "systemic_risks": initial_systemic_risks,
        "clause_analysis": list(analysis_data.values()),
        "knowledge_graph": generate_knowledge_graph_data(
            initial_systemic_risks,
            list(analysis_data.values()),
            detected_parties,
        )
    }
    return final_output

# --- Execute Phase 3 ---
# This block will now be managed by the FastAPI app
# try:
#     load_rag_components()
#     analysis_data = load_and_prepare_data()
#     final_results = run_analysis_pipeline(analysis_data)

#     logging.info(f"\n--- Deep Analysis Complete. Saving results to '{FINAL_ANALYSIS_OUTPUT}' ---")
#     with open(FINAL_ANALYSIS_OUTPUT, 'w', encoding='utf-8') as f:
#         json.dump(final_results, f, indent=2, ensure_ascii=False)

#     clause_analyses = final_results.get('clause_analysis', [])
#     systemic_risks_found = len(final_results.get('systemic_risks', []))
#     risk_counts = Counter(c.get('overall_risk_level', 'Not Assessed') for c in clause_analyses)
#     unconverged_count = sum(1 for c in clause_analyses if not c.get('is_converged'))
    
#     print("\n==================================================")
#     print("           DEEP ANALYSIS SUMMARY")
#     print("==================================================")
#     print(f"Total Clauses Analyzed: {len(clause_analyses)}")
#     print(f"Total Systemic Risks Found: {systemic_risks_found}")
#     print("-" * 50)
#     print("Clause Risk Level Distribution:")
#     print(f"  - High:         {risk_counts.get('High', 0)}")
#     print(f"  - Medium:       {risk_counts.get('Medium', 0)}")
#     print(f"  - Low:          {risk_counts.get('Low', 0)}")
#     print(f"  - Not Assessed: {risk_counts.get('Not Assessed', 0) + risk_counts.get('Error', 0)}")
#     print("-" * 50)
#     print(f"Clauses that did NOT converge in loophole analysis: {unconverged_count}")
#     print("==================================================\n")

# except (SystemExit, ValueError) as e:
#     print(f"\nA critical error occurred: {e}")
# except Exception as e:
#     logging.exception("An unexpected error occurred during deep analysis execution:")

def generate_pdf_report(json_path: str, output_path: str):
    """Generates a comprehensive PDF report from the final analysis JSON file."""
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    
    try:
        with open(json_path, "r", encoding='utf-8') as f:
            json_data = json.load(f)
    except FileNotFoundError:
        print(f"ERROR: Final analysis file '{json_path}' not found. Cannot generate report.")
        return
    
    clause_analysis = json_data.get("clause_analysis", [])
    if not clause_analysis:
        print("No clause analysis data found in the JSON file. Report will be empty.")
        return

    plt.figure(figsize=(5, 4))
    risk_counts = Counter(clause.get("overall_risk_level", "Not Assessed") for clause in clause_analysis)
    color_map = {"High": "red", "Medium": "orange", "Low": "green", "Not Assessed": "gray"}
    sorted_risk_levels = [level for level in color_map if level in risk_counts]
    sorted_counts = [risk_counts[level] for level in sorted_risk_levels]
    sorted_colors = [color_map[level] for level in sorted_risk_levels]
    plt.bar(sorted_risk_levels, sorted_counts, color=sorted_colors)
    plt.title("Clause Risk Level Distribution")
    plt.ylabel("Number of Clauses")
    plt.tight_layout()
    bar_plot_path = "risk_bar_plot.png"
    plt.savefig(bar_plot_path)
    plt.close()

    doc = SimpleDocTemplate(output_path, pagesize=A4, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
    story = []
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='Justify', alignment=4))

    disclaimer = """<b>Disclaimer:</b><br/>
    The loopholes and content presented have been generated by an LLM-based system and are intended solely for informational and review purposes. They should not be considered legal advice. By engaging with this material, you acknowledge and agree to the following:
    <br/><br/>
    <ul>
    <li>The content is not a substitute for professional legal counsel. Always consult a qualified legal professional before making any legal, financial, or strategic decisions.</li>
    <li>The loopholes discussed are theoretical and may not be valid, applicable, or ethical in all jurisdictions or scenarios.</li>
    <li>Laws and legal interpretations vary by location and evolve over time.</li>
    <li>No attorney-client relationship is formed through the use, review, or distribution of this content.</li>
    <li>The creators and contributors disclaim any liability for loss, harm, or consequences resulting from reliance on or misuse of this content.</li>
    </ul>
    """
    story.append(Paragraph("<b>Contract Analysis Report</b>", styles['h1']))
    story.append(Spacer(1, 20))
    story.append(Paragraph(disclaimer, styles['Normal']))
    story.append(FrameBreak())

    story.append(Paragraph("<b>Risk Score Analysis</b>", styles['Heading2']))
    story.append(Spacer(1, 12))
    story.append(Image(bar_plot_path, width=400, height=300))
    legend_text = """<b>Risk Color Code:</b><br/>
    <font color="green">● Low Risk</font><br/>
    <font color="orange">● Medium Risk</font><br/>
    <font color="red">● High Risk</font><br/>
    <font color="gray">● Not Assessed</font>"""
    story.append(Spacer(1, 12))
    story.append(Paragraph(legend_text, styles['Normal']))
    story.append(FrameBreak())

    MAX_CHAR_LIMIT_PER_PAGE = 7000
    for clause in clause_analysis:
        clause_num = clause['clause_number']
        clause_text = clause['content']
        summary = clause.get('final_analysis_summary', 'No summary available.').replace('\n', '<br/>')
        risk_label = clause.get('overall_risk_level', 'Not Assessed')
        
        if len(clause_text + summary) > MAX_CHAR_LIMIT_PER_PAGE:
            print(f"Skipping Clause {clause_num} in PDF – content too long for a single page.")
            continue

        def get_risk_badge(level):
            if level == "High": return Color(1, 0.3, 0.3), "High Risk"
            if level == "Medium": return Color(1, 0.7, 0.2), "Medium Risk"
            if level == "Low": return Color(0.4, 0.8, 0.4), "Low Risk"
            return colors.grey, "Not Assessed"

        badge_color, badge_label = get_risk_badge(risk_label)

        risk_badge = Table([[Paragraph(f"<b>Risk Level:</b> {badge_label}", styles['Normal'])]], colWidths=[450])
        risk_badge.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), badge_color), ('TEXTCOLOR', (0, 0), (0, 0), colors.white),
            ('ALIGN', (0, 0), (0, 0), 'CENTER'), ('FONTSIZE', (0, 0), (0, 0), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))

        data = [
            [Paragraph(f"<b>Clause {clause_num}</b>", styles['Heading3'])],
            [Paragraph(clause_text, styles['Justify'])],
            [Paragraph("<b>Final Analysis Summary</b>", styles['Heading4'])],
            [Paragraph(summary, styles['Justify'])]
        ]
        table = Table(data, colWidths=[450])
        table.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 1, colors.black), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue), ('BACKGROUND', (0, 2), (-1, 2), colors.lightgrey),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('LEFTPADDING', (0, 0), (-1, -1), 6), ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))

        story.append(KeepTogether([table, Spacer(1, 6), risk_badge, Spacer(1, 20)]))

    doc.build(story)
    print(f"✅ PDF report successfully created: {output_path}")
    
    if os.path.exists(bar_plot_path):
        os.remove(bar_plot_path)

# --- Execute Phase 4 ---
# This block will now be managed by the FastAPI app
# generate_pdf_report(FINAL_ANALYSIS_OUTPUT, PDF_REPORT_OUTPUT)
