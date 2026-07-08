"""Iteration 4 backend tests — new modules (roles, controllers, engineering, projects, AI, admin users)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://logic-led-config.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


# --- Auth helper ---
def _login(email, password):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    return s, r


@pytest.fixture(scope="module")
def admin_session():
    s, r = _login("admin@logic.com", "admin123")
    assert r.status_code == 200, f"admin login failed: {r.text}"
    assert r.json()["role"] == "super_admin"
    return s


# ---- Login / role migration ----
class TestAuthMigration:
    def test_super_admin_login(self):
        _, r = _login("admin@logic.com", "admin123")
        assert r.status_code == 200
        assert r.json()["role"] == "super_admin"

    def test_admin2_login(self):
        _, r = _login("admin2@logic.com", "admin2123")
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_dealer_login(self):
        _, r = _login("dealer@logic.com", "dealer123")
        assert r.status_code == 200
        assert r.json()["role"] == "dealer"

    def test_consultant_login(self):
        _, r = _login("consultant@logic.com", "consultant123")
        assert r.status_code == 200
        assert r.json()["role"] == "consultant"

    def test_customer_login(self):
        _, r = _login("customer@logic.com", "customer123")
        assert r.status_code == 200
        assert r.json()["role"] == "customer"

    def test_sales_login_migrated(self):
        _, r = _login("sales@logic.com", "sales123")
        assert r.status_code == 200
        # legacy sales_manager -> "sales" per seed migration
        assert r.json()["role"] == "sales"

    def test_presales_login_migrated(self):
        _, r = _login("presales@logic.com", "presales123")
        assert r.status_code == 200
        assert r.json()["role"] == "presales"


# ---- Meta roles ----
class TestMeta:
    def test_roles_returns_7(self, admin_session):
        r = admin_session.get(f"{API}/meta/roles", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert set(data["roles"]) == {"super_admin", "admin", "dealer", "sales", "presales", "consultant", "customer"}
        assert len(data["labels"]) == 7


# ---- Controllers ----
class TestControllers:
    def test_list_returns_9(self, admin_session):
        r = admin_session.get(f"{API}/controllers", timeout=15)
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) == 9
        models = {c["model"] for c in rows}
        assert {"VX600", "VX1000", "VX16S", "MX20", "MX40 Pro", "H2", "H5", "CX40", "MCTRL660"} <= models

    def test_plan_3M_pixels(self, admin_session):
        r = admin_session.post(f"{API}/controllers/plan", json={"total_pixels": 3_000_000}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        # smallest that fits 3M pixels is VX600 (3.9M) — but H2 (4M) and MCTRL660 (2.3M no)... 
        # sort by max_pixels asc, then price → VX600 first
        assert data["recommended"]["model"] in ("VX600", "H2")
        assert "ports_used" in data
        assert "ports_free" in data
        assert "utilization_percent" in data
        assert "note" in data
        assert data["quantity"] == 1

    def test_plan_huge_wall(self, admin_session):
        r = admin_session.post(f"{API}/controllers/plan", json={"total_pixels": 50_000_000}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        # exceeds all single units => uses MX40 Pro with qty>=2
        assert data["quantity"] >= 2


# ---- Engineering: Power ----
class TestPower:
    def test_power_three_phase(self, admin_session):
        payload = {"power_max_kw": 15, "power_typical_kw": 6, "phase": "three", "daily_hours": 10}
        r = admin_session.post(f"{API}/engineering/power", json=payload, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["phase"] == "three"
        assert d["voltage"] == 400
        # I = 15000 / (sqrt(3)*400*0.9) ≈ 24.06 A
        assert 20 < d["current_max_a"] < 30
        assert d["mcb_rating_a"] >= 32  # 24 * 1.25 = 30 → next std 32
        assert d["rccb_sensitivity_ma"] == 30
        assert d["cable_size_sqmm"] > 0
        assert d["ups_kva"] > 0
        assert d["generator_kva"] > 0
        assert d["monthly_kwh"] > 0
        assert d["monthly_cost_inr"] > 0


# ---- Engineering: Network ----
class TestNetwork:
    def test_network_basic(self, admin_session):
        payload = {"cabinets_x": 8, "cabinets_y": 5, "total_pixels": 4_000_000, "controller_ports": 16}
        r = admin_session.post(f"{API}/engineering/network", json=payload, timeout=15)
        assert r.status_code == 200
        d = r.json()
        # 4M / 650K = 7 home runs
        assert d["home_runs"] == 7
        assert "CAT6" in d["cable_type"]
        assert d["cable_length_m"] > 0
        assert isinstance(d["signal_flow"], list) and len(d["signal_flow"]) >= 3


# ---- Engineering: Structural ----
class TestStructural:
    def test_structural_basic(self, admin_session):
        payload = {"total_weight_kg": 320, "wall_w_mm": 4000, "wall_h_mm": 2250, "total_cabinets": 40, "mount_type": "wall_mount"}
        r = admin_session.post(f"{API}/engineering/structural", json=payload, timeout=15)
        assert r.status_code == 200
        d = r.json()
        # area = 4 * 2.25 = 9 sqm; bolts = max(6, ceil(9*4)) = 36
        assert d["anchor_bolt_count"] >= 6
        assert d["recommended_structure"]
        assert d["load_per_sqm"] > 0
        assert "M12" in d["anchor_bolt_spec"]


# ---- Projects pipeline ----
class TestProjects:
    _created_id = None

    def test_get_stages(self, admin_session):
        r = admin_session.get(f"{API}/projects/stages", timeout=15)
        assert r.status_code == 200
        assert len(r.json()["stages"]) == 10

    def test_create_and_move(self, admin_session):
        # need a customer id first
        customers = admin_session.get(f"{API}/customers", timeout=15).json()
        assert len(customers) > 0
        cid = customers[0]["id"]
        payload = {"name": "TEST_ITER4 Pipeline Project", "customer_id": cid, "stage": "enquiry", "value": 500000}
        r = admin_session.post(f"{API}/projects", json=payload, timeout=15)
        assert r.status_code == 200
        proj = r.json()
        assert proj["stage"] == "enquiry"
        assert "id" in proj
        TestProjects._created_id = proj["id"]
        # move forward
        r2 = admin_session.patch(f"{API}/projects/{proj['id']}/stage?stage=quotation", timeout=15)
        assert r2.status_code == 200
        assert r2.json()["stage"] == "quotation"
        # verify via GET
        listing = admin_session.get(f"{API}/projects", timeout=15).json()
        match = [p for p in listing if p["id"] == proj["id"]]
        assert match and match[0]["stage"] == "quotation"

    def test_zzz_cleanup(self, admin_session):
        if TestProjects._created_id:
            r = admin_session.delete(f"{API}/projects/{TestProjects._created_id}", timeout=15)
            assert r.status_code == 200


# ---- Admin user management ----
class TestAdminUsers:
    _created_id = None

    def test_create_user(self, admin_session):
        payload = {"email": "test_iter4@logic.com", "password": "testpass123",
                   "name": "TEST_ITER4 User", "role": "sales", "active": True}
        # Delete first in case it exists
        r_list = admin_session.get(f"{API}/auth/users", timeout=15).json()
        for u in r_list:
            if u["email"] == payload["email"]:
                admin_session.delete(f"{API}/admin/users/{u['id']}", timeout=15)
        r = admin_session.post(f"{API}/admin/users", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == payload["email"]
        assert data["role"] == "sales"
        TestAdminUsers._created_id = data["id"]

    def test_login_created_user(self):
        _, r = _login("test_iter4@logic.com", "testpass123")
        assert r.status_code == 200

    def test_update_user_role_and_active(self, admin_session):
        uid = TestAdminUsers._created_id
        assert uid
        r = admin_session.put(f"{API}/admin/users/{uid}", json={"role": "presales", "active": False}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["role"] == "presales"
        assert d["active"] is False

    def test_cannot_delete_self(self, admin_session):
        me = admin_session.get(f"{API}/auth/me", timeout=15).json()
        r = admin_session.delete(f"{API}/admin/users/{me['id']}", timeout=15)
        assert r.status_code == 400

    def test_zzz_cleanup_delete(self, admin_session):
        uid = TestAdminUsers._created_id
        if uid:
            r = admin_session.delete(f"{API}/admin/users/{uid}", timeout=15)
            assert r.status_code == 200


# ---- AI Content ----
class TestAIContent:
    def test_content_types(self, admin_session):
        r = admin_session.get(f"{API}/ai/content/types", timeout=15)
        assert r.status_code == 200
        assert len(r.json()) >= 5

    def test_content_generate(self, admin_session):
        payload = {"content_type": "linkedin", "context": "Boardroom videowall for HDFC Bank Mumbai, 4m x 2.25m P1.5"}
        r = admin_session.post(f"{API}/ai/content", json=payload, timeout=90)
        # PASS if 200 OR 402 (budget exceeded — intentional per problem statement)
        assert r.status_code in (200, 402, 503), r.text
        if r.status_code == 200:
            assert len(r.json().get("content", "")) > 20


# ---- AI Render (Nano Banana) ----
class TestAIRender:
    def test_scenes(self, admin_session):
        r = admin_session.get(f"{API}/ai/render/scenes", timeout=15)
        assert r.status_code == 200
        keys = [s["key"] for s in r.json()]
        assert "meeting_room" in keys

    def test_render_generate(self, admin_session):
        payload = {"scene": "meeting_room", "wall_width_m": 4, "wall_height_m": 2.25}
        r = admin_session.post(f"{API}/ai/render", json=payload, timeout=180)
        # PASS if 200 OR 402 (budget) OR 503 (service temp)
        assert r.status_code in (200, 402, 503), r.text
        if r.status_code == 200:
            d = r.json()
            assert ("file_id" in d and "url" in d) or "data_url" in d


# ---- Regression: existing endpoints still work ----
class TestRegression:
    def test_products(self, admin_session):
        r = admin_session.get(f"{API}/products", timeout=15)
        assert r.status_code == 200
        assert len(r.json()) >= 8

    def test_customers(self, admin_session):
        r = admin_session.get(f"{API}/customers", timeout=15)
        assert r.status_code == 200
        assert len(r.json()) >= 4

    def test_partners(self, admin_session):
        r = admin_session.get(f"{API}/partners", timeout=15)
        assert r.status_code == 200
        assert len(r.json()) >= 3

    def test_quotes_list(self, admin_session):
        r = admin_session.get(f"{API}/quotes", timeout=15)
        assert r.status_code == 200

    def test_dashboard_stats(self, admin_session):
        r = admin_session.get(f"{API}/dashboard/stats", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "total_quotations" in d
        assert "total_customers" in d

    def test_configure(self, admin_session):
        products = admin_session.get(f"{API}/products", timeout=15).json()
        pid = products[0]["id"]
        r = admin_session.post(f"{API}/configure", json={"product_id": pid, "width": 4000, "height": 2250, "unit": "mm"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["grand_total"] > 0
        assert len(d["items"]) > 0
