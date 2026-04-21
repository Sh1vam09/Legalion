from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import os
import uuid 
import shutil
from datetime import datetime
import json
from starlette.staticfiles import StaticFiles # <-- ADD THIS IMPORT

from notebook_module import (
    configure_gemini_api,
    set_model_name,
    extract_text_from_pdf,
    process_text_to_clauses,
    run_strict_analysis,
    load_rag_components,
    load_and_prepare_data,
    run_analysis_pipeline,
    generate_pdf_report,
    CLAUSES_JSON_OUTPUT,
    AMBIGUITY_JSON_OUTPUT,
    FINAL_ANALYSIS_OUTPUT,
    PDF_REPORT_OUTPUT
)

app = FastAPI(title="Contract Analysis API", version="1.0.0")

default_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://legalionweb.vercel.app",
]
configured_origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]
origin_regex = os.getenv("FRONTEND_ORIGIN_REGEX")
origins = [*default_origins, *configured_origins]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = "data"
os.makedirs(BASE_DIR, exist_ok=True)

# ----------------------------------------------------
# FIX: MOUNT THE 'data' DIRECTORY FOR STATIC FILE SERVING
# ----------------------------------------------------
app.mount("/data", StaticFiles(directory=BASE_DIR), name="data")
# Now, requests to http://127.0.0.1:8000/data/... will be served directly from the local 'data' folder.
# ----------------------------------------------------

@app.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    api_key: str = Form(...),
    model_name: str = Form(default="gemini-2.5-flash-lite"),
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    if not api_key or not api_key.strip():
        raise HTTPException(status_code=400, detail="A Gemini API key is required.")

    # Configure Gemini with the user-supplied key and chosen model (not stored anywhere)
    try:
        configure_gemini_api(api_key)
        set_model_name(model_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    file_id = str(uuid.uuid4()) # Each upload gets a UNIQUE ID
    file_dir = os.path.join(BASE_DIR, file_id) # A UNIQUE DIRECTORY is created for this ID
    os.makedirs(file_dir, exist_ok=True)

    pdf_path = os.path.join(file_dir, "uploaded.pdf") # PDF is saved in its unique directory
    with open(pdf_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        full_text = extract_text_from_pdf(pdf_path)
        
        text_output_path = os.path.join(file_dir, "full_text.txt") # Extracted text in unique directory
        with open(text_output_path, "w", encoding="utf-8") as f:
            f.write(full_text)

        return {"file_id": file_id, "message": "PDF uploaded and text extracted using Gemini."}
    except Exception as e:
        if os.path.exists(file_dir):
            shutil.rmtree(file_dir)
        raise HTTPException(status_code=500, detail=f"Error during PDF text extraction with Gemini: {e}")

@app.post("/segment/{file_id}")
async def segment_clauses(
    file_id: str,
    x_api_key: str = Header(..., alias="X-Api-Key"),
    x_model_name: str = Header(default="gemini-2.5-flash-lite", alias="X-Model-Name"),
):
    # Re-configure Gemini with the key and model passed in request headers
    try:
        configure_gemini_api(x_api_key)
        set_model_name(x_model_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    file_dir = os.path.join(BASE_DIR, file_id) # Reconstruct unique directory path
    full_text_path = os.path.join(file_dir, "full_text.txt")
    clauses_output_path = os.path.join(file_dir, CLAUSES_JSON_OUTPUT) # `clauses.json` written to unique directory

    if not os.path.exists(full_text_path):
        raise HTTPException(status_code=404, detail="Full text not found for this file_id. Please upload the PDF first.")

    with open(full_text_path, encoding="utf-8") as f:
        full_text = f.read()

    clauses = process_text_to_clauses(full_text)

    with open(clauses_output_path, "w", encoding="utf-8") as f:
        json.dump(clauses, f, indent=2, ensure_ascii=False)

    return {"clauses_extracted": len(clauses), "message": "Segmentation completed."}

@app.post("/analyze/ambiguity/{file_id}")
async def ambiguity_analysis(
    file_id: str,
    x_api_key: str = Header(..., alias="X-Api-Key"),
    x_model_name: str = Header(default="gemini-2.5-flash-lite", alias="X-Model-Name"),
):
    # Re-configure Gemini with the key and model passed in request headers
    try:
        configure_gemini_api(x_api_key)
        set_model_name(x_model_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    file_dir = os.path.join(BASE_DIR, file_id) # Reconstruct unique directory path
    input_path = os.path.join(file_dir, CLAUSES_JSON_OUTPUT)
    output_path = os.path.join(file_dir, AMBIGUITY_JSON_OUTPUT) # `ambiguity_analysis_strict.json` written to unique directory

    if not os.path.exists(input_path):
        raise HTTPException(status_code=404, detail="Segmented clauses not found.")

    original_cwd = os.getcwd()
    os.chdir(file_dir) # Temporarily change to the unique directory
    try:
        # run_strict_analysis now operates on files within this unique directory
        run_strict_analysis(CLAUSES_JSON_OUTPUT, AMBIGUITY_JSON_OUTPUT) 
    finally:
        os.chdir(original_cwd)
        
    return {"message": "Ambiguity analysis complete."}

@app.post("/analyze/deep/{file_id}")
async def deep_analysis(
    file_id: str,
    x_api_key: str = Header(..., alias="X-Api-Key"),
    x_model_name: str = Header(default="gemini-2.5-flash-lite", alias="X-Model-Name"),
):
    # Re-configure Gemini with the key and model passed in request headers
    try:
        configure_gemini_api(x_api_key)
        set_model_name(x_model_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    file_dir = os.path.join(BASE_DIR, file_id) # This defines the user-specific directory

    # Load RAG components BEFORE changing directory, as their paths are fixed absolute paths
    try:
        if not load_rag_components():
            raise HTTPException(status_code=500, detail="Failed to load RAG components. Ensure FAISS index and metadata exist.")

        # NOW, change directory for user-specific files
        original_cwd = os.getcwd() # Save original CWD
        os.chdir(file_dir) # Change CWD to the file-specific directory

        # load_and_prepare_data will now correctly look
        # for CLAUSES_JSON_OUTPUT and AMBIGUITY_JSON_OUTPUT within file_dir
        analysis_data = load_and_prepare_data()
        final_results = run_analysis_pipeline(analysis_data)

        # Save the final output to the correct file in the current directory (file_dir)
        # The name 'FINAL_ANALYSIS_OUTPUT' is just a filename, it gets saved in file_dir
        with open(FINAL_ANALYSIS_OUTPUT, "w", encoding="utf-8") as f: # Not os.path.join(file_dir, FINAL_ANALYSIS_OUTPUT) here as CWD is already file_dir
            json.dump(final_results, f, indent=2, ensure_ascii=False)

        return {"message": "Deep analysis complete."}
    except FileNotFoundError as e:
        # The `SystemExit` from notebook_module.py's load_and_prepare_data
        # is converted to an HTTPException here.
        raise HTTPException(status_code=404, detail=f"Required analysis file not found: {e.filename}. Ensure previous steps are completed.")
    except SystemExit as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error during deep analysis: {e}")
    finally:
        if 'original_cwd' in locals():
            os.chdir(original_cwd)

@app.get("/report/{file_id}")
async def generate_report(file_id: str): # `file_id` ensures specific user's data is accessed
    file_dir = os.path.join(BASE_DIR, file_id) # Reconstruct unique directory path
    json_path = os.path.join(file_dir, FINAL_ANALYSIS_OUTPUT)
    report_path = os.path.join(file_dir, PDF_REPORT_OUTPUT) # Report saved in unique directory

    if not os.path.exists(json_path):
        raise HTTPException(status_code=404, detail="Deep analysis data not found. Run deep analysis first.")

    original_cwd = os.getcwd()
    os.chdir(file_dir) # Temporarily change to unique directory
    try:
        # generate_pdf_report operates on files within this unique directory
        generate_pdf_report(FINAL_ANALYSIS_OUTPUT, PDF_REPORT_OUTPUT) 
    finally:
        os.chdir(original_cwd)
    
    if not os.path.exists(report_path):
        raise HTTPException(status_code=500, detail="Failed to generate PDF report.")

    return FileResponse(report_path, media_type="application/pdf", content_disposition_type="inline")


@app.delete("/files/{file_id}")
async def delete_file(file_id: str): # Deletes only the specific user's directory
    file_dir = os.path.join(BASE_DIR, file_id)
    if os.path.exists(file_dir):
        shutil.rmtree(file_dir)
        return {"message": f"Files for {file_id} deleted successfully."}
    else:
        raise HTTPException(status_code=404, detail="File not found")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        # These counts would also require proper state management
        "uploaded_file_dirs_count": len(os.listdir(BASE_DIR)), 
        "message": "Basic health check passed. Full status requires state management."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
