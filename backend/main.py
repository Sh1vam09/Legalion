from fastapi import BackgroundTasks, FastAPI, UploadFile, File, HTTPException, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import os
import uuid 
import shutil
from datetime import datetime, timedelta, timezone
import json
import threading
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
JOBS_DIR = "jobs"
os.makedirs(JOBS_DIR, exist_ok=True)
JOB_STALE_AFTER = timedelta(minutes=15)
CWD_LOCK = threading.Lock()

# ----------------------------------------------------
# FIX: MOUNT THE 'data' DIRECTORY FOR STATIC FILE SERVING
# ----------------------------------------------------
app.mount("/data", StaticFiles(directory=BASE_DIR), name="data")
# Now, requests to http://127.0.0.1:8000/data/... will be served directly from the local 'data' folder.
# ----------------------------------------------------

def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def job_path(job_id: str) -> str:
    return os.path.join(JOBS_DIR, f"{job_id}.json")

def atomic_write_json(path: str, data: dict):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    temp_path = f"{path}.tmp"
    with open(temp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.replace(temp_path, path)

def read_job(job_id: str) -> dict | None:
    path = job_path(job_id)
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def write_job(job: dict):
    job["updated_at"] = utc_now_iso()
    atomic_write_json(job_path(job["job_id"]), job)

def update_job(job_id: str, **updates):
    job = read_job(job_id) or {"job_id": job_id}
    job.update(updates)
    write_job(job)

def create_deep_analysis_job(file_id: str) -> dict:
    job_id = str(uuid.uuid4())
    job = {
        "job_id": job_id,
        "file_id": file_id,
        "status": "queued",
        "progress": 75,
        "message": "Deep analysis queued.",
        "result_path": None,
        "result_url": None,
        "error": None,
        "created_at": utc_now_iso(),
        "updated_at": utc_now_iso(),
    }
    atomic_write_json(job_path(job_id), job)
    return job

def mark_interrupted_if_stale(job: dict) -> dict:
    if job.get("status") not in {"queued", "running"}:
        return job
    try:
        updated_at = datetime.fromisoformat(job["updated_at"])
    except (KeyError, ValueError):
        return job
    if updated_at.tzinfo is None:
        updated_at = updated_at.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) - updated_at > JOB_STALE_AFTER:
        job.update({
            "status": "interrupted",
            "message": "The analysis appears to have been interrupted. Please retry.",
            "error": "The background analysis stopped updating, likely because the free Render instance restarted.",
        })
        write_job(job)
    return job

def run_deep_analysis_job(job_id: str, file_id: str, api_key: str, model_name: str):
    file_dir = os.path.abspath(os.path.join(BASE_DIR, file_id))
    result_path = os.path.join(file_dir, FINAL_ANALYSIS_OUTPUT)
    heartbeat_stop = threading.Event()

    def heartbeat():
        while not heartbeat_stop.wait(30):
            update_job(
                job_id,
                status="running",
                progress=90,
                message="Deep analysis is still running.",
            )

    heartbeat_thread = threading.Thread(target=heartbeat, daemon=True)
    original_cwd = None

    try:
        update_job(job_id, status="running", progress=78, message="Configuring AI model.")
        configure_gemini_api(api_key)
        set_model_name(model_name)

        update_job(job_id, status="running", progress=80, message="Loading legal retrieval components.")
        if not load_rag_components():
            raise RuntimeError("Failed to load RAG components. Ensure FAISS index and metadata exist.")

        if not os.path.isdir(file_dir):
            raise FileNotFoundError(file_dir)

        with CWD_LOCK:
            original_cwd = os.getcwd()
            os.chdir(file_dir)
            try:
                update_job(job_id, status="running", progress=84, message="Preparing clause data.")
                analysis_data = load_and_prepare_data()

                update_job(job_id, status="running", progress=88, message="Running deep legal analysis.")
                heartbeat_thread.start()
                final_results = run_analysis_pipeline(analysis_data)
                heartbeat_stop.set()
                heartbeat_thread.join(timeout=5)

                update_job(job_id, status="running", progress=96, message="Saving final analysis.")
                with open(FINAL_ANALYSIS_OUTPUT, "w", encoding="utf-8") as f:
                    json.dump(final_results, f, indent=2, ensure_ascii=False)
            finally:
                heartbeat_stop.set()
                if heartbeat_thread.is_alive():
                    heartbeat_thread.join(timeout=5)
                if original_cwd:
                    os.chdir(original_cwd)

        update_job(
            job_id,
            status="completed",
            progress=100,
            message="Deep analysis complete.",
            result_path=result_path,
            result_url=f"/data/{file_id}/{FINAL_ANALYSIS_OUTPUT}",
            error=None,
        )
    except FileNotFoundError as e:
        update_job(
            job_id,
            status="failed",
            progress=100,
            message="Required analysis file not found. Ensure previous steps are completed.",
            error=str(e),
        )
    except SystemExit as e:
        update_job(
            job_id,
            status="failed",
            progress=100,
            message="Deep analysis failed while preparing data.",
            error=str(e),
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        update_job(
            job_id,
            status="failed",
            progress=100,
            message="Error during deep analysis.",
            error=str(e),
        )

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
    background_tasks: BackgroundTasks,
    x_api_key: str = Header(..., alias="X-Api-Key"),
    x_model_name: str = Header(default="gemini-2.5-flash-lite", alias="X-Model-Name"),
):
    # Validate Gemini configuration before accepting the background job.
    try:
        configure_gemini_api(x_api_key)
        set_model_name(x_model_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    file_dir = os.path.join(BASE_DIR, file_id)
    clauses_path = os.path.join(file_dir, CLAUSES_JSON_OUTPUT)
    ambiguity_path = os.path.join(file_dir, AMBIGUITY_JSON_OUTPUT)

    if not os.path.isdir(file_dir):
        raise HTTPException(status_code=404, detail="File not found. Please upload the PDF first.")
    if not os.path.exists(clauses_path):
        raise HTTPException(status_code=404, detail="Segmented clauses not found. Run segmentation first.")
    if not os.path.exists(ambiguity_path):
        raise HTTPException(status_code=404, detail="Ambiguity analysis not found. Run ambiguity analysis first.")

    job = create_deep_analysis_job(file_id)
    background_tasks.add_task(run_deep_analysis_job, job["job_id"], file_id, x_api_key, x_model_name)

    return {
        "message": "Deep analysis started.",
        "job_id": job["job_id"],
        "status": job["status"],
        "progress": job["progress"],
        "status_url": f"/analyze/deep/status/{job['job_id']}",
    }

@app.get("/analyze/deep/status/{job_id}")
async def deep_analysis_status(job_id: str):
    job = read_job(job_id)
    if job is None:
        return JSONResponse(
            status_code=200,
            content={
                "job_id": job_id,
                "status": "expired",
                "progress": 100,
                "message": "Job state was lost because the free Render instance restarted, redeployed, or spun down. Please run analysis again.",
                "result_path": None,
                "result_url": None,
                "error": "Job file not found.",
            },
        )
    return mark_interrupted_if_stale(job)

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
