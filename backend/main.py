from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth.jwt import setup_users

from routers.auth import router as auth_router
from routers.cases import router as cases_router
from routers.timeline import router as timeline_router
from routers.graph import router as graph_router
from routers.alerts import router as alerts_router
from routers.score import router as score_router
from routers.criminalflow import router as criminalflow_router
from routers.geospatial import router as geospatial_router
from routers.correlation import router as correlation_router
from routers.entities import router as entities_router
from routers.report import router as report_router
from routers.search import router as search_router

# Initialize the mock users
setup_users()

app = FastAPI(title="DigitalSentinel API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/debug/cors")
def cors_debug():
    return {"cors": "ok", "message": "If you see this from the browser, CORS works."}

from fastapi import Depends
from auth.dependencies import get_current_user

app.include_router(auth_router, prefix="/api")
app.include_router(cases_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(timeline_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(graph_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(alerts_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(score_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(criminalflow_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(geospatial_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(correlation_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(entities_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(report_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(search_router, prefix="/api", dependencies=[Depends(get_current_user)])

@app.get("/api/health")
def health():
    from datetime import datetime, timezone
    return {
        "status": "ok",
        "time": datetime.now(timezone.utc).isoformat(),
        "version": "3.0.0"
    }
