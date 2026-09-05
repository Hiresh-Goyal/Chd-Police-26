import subprocess
import time
import os
import sys

def start_services():
    print("Starting DigitalSentinel Services...")
    
    # Start Postgres (Assuming E:\pgsql is setup)
    print("Starting PostgreSQL...")
    postgres_cmd = r"E:\pgsql\pgsql\bin\pg_ctl.exe -D E:\pgsql\data -l E:\pgsql\logfile start"
    try:
        subprocess.run(postgres_cmd, shell=True, check=False)
    except Exception as e:
        print(f"Warning: Could not start postgres automatically: {e}")
        
    time.sleep(2)
    
    # Start Backend
    print("Starting FastAPI Backend on port 8000...")
    backend_proc = subprocess.Popen(
        ["python", "-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
        cwd=os.path.join(os.getcwd(), "backend"),
        shell=True
    )
    
    # Start Frontend
    print("Starting React Frontend on port 5173...")
    frontend_proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=os.path.join(os.getcwd(), "frontend"),
        shell=True
    )
    
    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\nShutting down services...")
        backend_proc.terminate()
        frontend_proc.terminate()
        
        # Stop Postgres
        print("Stopping PostgreSQL...")
        subprocess.run(r"E:\pgsql\pgsql\bin\pg_ctl.exe -D E:\pgsql\data stop", shell=True, check=False)

if __name__ == "__main__":
    start_services()
