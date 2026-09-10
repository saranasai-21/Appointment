"""
Launcher script for the Appointment Board Full Stack Application.
Runs FastAPI with Uvicorn, serving both the REST API and the React SPA frontend.
"""
import sys
import webbrowser
import uvicorn

if __name__ == "__main__":
    print("=========================================================")
    print(" TeamSync Appointment Board - Full Stack Application")
    print(" Tech: Python (FastAPI + SQL 80%) • React (20%)")
    print("=========================================================")
    print(" Starting server on http://127.0.0.1:8000 ...")
    print(" Open http://127.0.0.1:8000 in your browser to view the board.")
    print(" Press CTRL+C to stop the server.")
    print("=========================================================")

    # Automatically open browser
    try:
        webbrowser.open("http://127.0.0.1:8000")
    except Exception:
        pass

    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=False)
