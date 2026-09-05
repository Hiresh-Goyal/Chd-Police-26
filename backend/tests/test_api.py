import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "1.0"}

def test_cases_endpoints():
    # Create Case
    response = client.post("/api/v1/cases", json={"title": "Test API Case", "description": "Desc"})
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["title"] == "Test API Case"
    case_id = data["id"]
    
    # List Cases
    response = client.get("/api/v1/cases")
    assert response.status_code == 200
    assert len(response.json()) > 0
    
    # Get Case
    response = client.get(f"/api/v1/cases/{case_id}")
    assert response.status_code == 200
    assert response.json()["title"] == "Test API Case"
