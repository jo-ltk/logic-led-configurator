"""
Focused verification tests for the health-check deployment fix.
Verifies:
  - /health and /api/health return 200 {status: ok}
  - Existing critical endpoints unaffected (auth login, dashboard stats, products, configure)
  - Frontend index still loads
"""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # Read from frontend .env as fallback for pytest context
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.strip().split("=", 1)[1]
                    break
    except Exception:
        pass
BASE_URL = BASE_URL.rstrip("/")
# K8s liveness/readiness probes hit the pod on its internal port directly.
# The public ingress only routes /api/* to backend, so /health must be tested
# against the internal service address (this mirrors what the ingress probe does).
INTERNAL_BASE_URL = "http://localhost:8001"

ADMIN_EMAIL = "admin@logic.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_session(session):
    r = session.post(f"{BASE_URL}/api/auth/login",
                     json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data
    # cookies are set automatically on the session
    return session


# --- Health endpoints (the fix) ---
class TestHealthEndpoints:
    def test_root_health_internal(self, session):
        # K8s ingress probes hit /health on pod port 8001 directly
        r = session.get(f"{INTERNAL_BASE_URL}/health", timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("status") == "ok", f"Payload mismatch: {data}"

    def test_api_health_public(self, session):
        r = session.get(f"{BASE_URL}/api/health", timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("status") == "ok", f"Payload mismatch: {data}"

    def test_api_health_internal(self, session):
        r = session.get(f"{INTERNAL_BASE_URL}/api/health", timeout=10)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_health_no_auth_required(self):
        fresh = requests.Session()
        r = fresh.get(f"{INTERNAL_BASE_URL}/health", timeout=10)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# --- Existing critical endpoints still working ---
class TestExistingEndpointsUnaffected:
    def test_auth_login_returns_token(self, session):
        r = session.post(f"{BASE_URL}/api/auth/login",
                         json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert isinstance(data["access_token"], str) and len(data["access_token"]) > 10

    def test_dashboard_stats(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/dashboard/stats")
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert isinstance(data, dict) and len(data) > 0

    def test_products_list(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/products")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Expected at least 1 seeded product"

    def test_configure_endpoint(self, admin_session):
        prods = admin_session.get(f"{BASE_URL}/api/products").json()
        assert prods, "No products available for configure test"
        product_id = prods[0].get("id") or prods[0].get("_id")
        payload = {
            "product_id": product_id,
            "width": 3000,
            "height": 2000,
        }
        r = admin_session.post(f"{BASE_URL}/api/configure", json=payload)
        assert r.status_code == 200, f"configure failed: {r.status_code} {r.text[:400]}"
        data = r.json()
        assert isinstance(data, dict)


# --- Frontend still serves ---
class TestFrontendReachable:
    def test_login_page_html(self, session):
        r = session.get(f"{BASE_URL}/login", timeout=15, allow_redirects=True)
        assert r.status_code == 200, f"Frontend /login returned {r.status_code}"
        # Should return HTML
        assert "<html" in r.text.lower() or "<!doctype html" in r.text.lower()
