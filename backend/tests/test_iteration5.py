"""Iteration 5 backend tests.

Coverage:
- Power engineering with Indian MCB ratings only (6/10/16/20/32A)
- Network engineering vertical (indoor) / horizontal (outdoor) looping
- Controllers CRUD (POST/PUT/DELETE)
- Quotes with extended optional fields (power_data, network_data, controller_data,
  render_file_id, cover_intro, pdf_sections) + PDF generation
- Basic regression: login, controllers list, engineering endpoints reachable
"""
import os
import io
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://logic-led-config.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@logic.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text[:200]}")
    tok = r.json().get("access_token")
    if tok:
        s.headers.update({"Authorization": f"Bearer {tok}"})
    return s


# ---------------- Power ----------------

class TestPowerMCBIndian:
    """Verify Indian standard MCB combos: only 6/10/16/20/32 A allowed"""
    ALLOWED = {6, 10, 16, 20, 32}

    def test_power_small_single_phase(self, admin_session):
        r = admin_session.post(f"{API}/engineering/power",
                               json={"power_max_kw": 2, "power_typical_kw": 1, "phase": "single"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["mcb_rating_a"] in self.ALLOWED
        assert d["mcb_combo"].endswith("A")
        # e.g. "1 × 16A"
        parts = d["mcb_combo"].replace("×", "x").split("x")
        rating = int(parts[1].strip().rstrip("A"))
        assert rating in self.ALLOWED

    def test_power_medium(self, admin_session):
        r = admin_session.post(f"{API}/engineering/power",
                               json={"power_max_kw": 10, "power_typical_kw": 4, "phase": "single"})
        assert r.status_code == 200
        d = r.json()
        # 10kW single = ~48A → target 60A → needs 2×32A
        assert d["mcb_rating_a"] in self.ALLOWED
        assert d["mcb"]["rating_a"] in self.ALLOWED
        assert d["mcb"]["count"] >= 1
        assert "combo" in d["mcb"]

    def test_power_large_three_phase(self, admin_session):
        r = admin_session.post(f"{API}/engineering/power",
                               json={"power_max_kw": 25, "power_typical_kw": 12, "phase": "three"})
        assert r.status_code == 200
        d = r.json()
        assert d["mcb_rating_a"] in self.ALLOWED
        assert d["voltage"] == 400

    def test_mcb_never_uses_40_50_63(self, admin_session):
        # Test wide range – ensure 40/50/63 never appear as rating
        for kw in [1, 3, 5, 8, 10, 15, 20, 25, 30, 40]:
            r = admin_session.post(f"{API}/engineering/power",
                                   json={"power_max_kw": kw, "power_typical_kw": kw / 2,
                                         "phase": "single" if kw < 10 else "three"})
            assert r.status_code == 200
            d = r.json()
            assert d["mcb_rating_a"] in self.ALLOWED, f"Illegal MCB rating {d['mcb_rating_a']} for {kw}kW"
            # Also verify combo string uses only allowed values
            combo = d["mcb_combo"]
            assert not any(x in combo for x in ["40A", "50A", "63A"]), f"Illegal rating in combo: {combo}"


# ---------------- Network ----------------

class TestNetworkLooping:
    def test_indoor_vertical_looping(self, admin_session):
        # small wall: col_pixels well under 650000/port → one loop per column
        r = admin_session.post(f"{API}/engineering/network",
                               json={"cabinets_x": 8, "cabinets_y": 5,
                                     "total_pixels": 4_000_000,
                                     "controller_ports": 16, "environment": "indoor"})
        assert r.status_code == 200
        d = r.json()
        assert d["looping_strategy"] == "Vertical"
        # home_runs should be cabinets_x (8) OR 2×cabinets_x if capacity exceeded
        assert d["home_runs"] in (8, 16)

    def test_indoor_vertical_capacity_exceeded(self, admin_session):
        # Big column: 20 cabs tall with high pixels_per_cabinet
        r = admin_session.post(f"{API}/engineering/network",
                               json={"cabinets_x": 5, "cabinets_y": 20,
                                     "total_pixels": 20_000_000,
                                     "pixels_per_cabinet": 200000,  # 20*200000 = 4M > 650k
                                     "controller_ports": 32, "environment": "indoor"})
        assert r.status_code == 200
        d = r.json()
        assert d["looping_strategy"] == "Vertical"
        assert d["home_runs"] == 5 * 2  # split each column

    def test_outdoor_horizontal_looping(self, admin_session):
        r = admin_session.post(f"{API}/engineering/network",
                               json={"cabinets_x": 10, "cabinets_y": 4,
                                     "total_pixels": 4_000_000,
                                     "controller_ports": 16, "environment": "outdoor"})
        assert r.status_code == 200
        d = r.json()
        assert d["looping_strategy"] == "Horizontal"
        assert d["home_runs"] in (4, 8)  # cabinets_y or 2×cabinets_y

    def test_outdoor_horizontal_capacity_exceeded(self, admin_session):
        r = admin_session.post(f"{API}/engineering/network",
                               json={"cabinets_x": 20, "cabinets_y": 3,
                                     "total_pixels": 15_000_000,
                                     "pixels_per_cabinet": 200000,  # 20*200k=4M > 650k
                                     "controller_ports": 32, "environment": "outdoor"})
        assert r.status_code == 200
        d = r.json()
        assert d["looping_strategy"] == "Horizontal"
        assert d["home_runs"] == 3 * 2


# ---------------- Controllers CRUD ----------------

class TestControllersCRUD:
    @pytest.fixture
    def created_controller(self, admin_session):
        body = {
            "model": f"TEST_ITER5_{uuid.uuid4().hex[:6]}",
            "class_": "Custom",
            "max_pixels": 2_500_000,
            "output_ports": 8,
            "pixels_per_port": 650000,
            "features": ["HDR", "Test"],
            "price": 50000,
        }
        r = admin_session.post(f"{API}/controllers", json=body)
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["model"] == body["model"]
        assert doc["max_pixels"] == body["max_pixels"]
        assert doc["output_ports"] == 8
        assert "id" in doc
        yield doc
        # Cleanup
        try:
            admin_session.delete(f"{API}/controllers/{doc['id']}")
        except Exception:
            pass

    def test_create_controller(self, created_controller):
        assert created_controller["model"].startswith("TEST_ITER5_")

    def test_controller_appears_in_list(self, admin_session, created_controller):
        r = admin_session.get(f"{API}/controllers")
        assert r.status_code == 200
        models = [c["model"] for c in r.json()]
        assert created_controller["model"] in models

    def test_update_controller(self, admin_session, created_controller):
        cid = created_controller["id"]
        r = admin_session.put(f"{API}/controllers/{cid}",
                              json={"price": 75000, "output_ports": 12})
        assert r.status_code == 200
        doc = r.json()
        assert doc["price"] == 75000
        assert doc["output_ports"] == 12

    def test_delete_controller(self, admin_session):
        # Create fresh, then delete
        body = {"model": f"TEST_DEL_{uuid.uuid4().hex[:6]}", "class_": "Custom",
                "max_pixels": 1000000, "output_ports": 4, "pixels_per_port": 250000}
        r = admin_session.post(f"{API}/controllers", json=body)
        cid = r.json()["id"]
        r2 = admin_session.delete(f"{API}/controllers/{cid}")
        assert r2.status_code == 200
        # Verify removed
        r3 = admin_session.get(f"{API}/controllers")
        assert body["model"] not in [c["model"] for c in r3.json()]


# ---------------- Quotes with extended fields ----------------

class TestQuoteExtended:
    @pytest.fixture(scope="class")
    def customer_id(self, admin_session):
        # Get any existing customer
        r = admin_session.get(f"{API}/customers")
        assert r.status_code == 200
        rows = r.json()
        if rows:
            return rows[0]["id"]
        # Or create a new one
        r2 = admin_session.post(f"{API}/customers", json={"company": "TEST_ITER5_Customer"})
        return r2.json()["id"]

    @pytest.fixture(scope="class")
    def product_id(self, admin_session):
        r = admin_session.get(f"{API}/products")
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) > 0
        return rows[0]["id"]

    @pytest.fixture(scope="class")
    def quote_id(self, admin_session, customer_id, product_id):
        config = {
            "product_id": product_id, "width_mm": 4000, "height_mm": 2250,
            "cabinets_x": 8, "cabinets_y": 5, "total_cabinets": 40,
            "total_width_mm": 4000, "total_height_mm": 2250,
            "resolution_w": 1920, "resolution_h": 1080, "total_pixels": 2073600,
            "diagonal_inch": 180, "aspect_ratio": "16:9",
            "led_area_sqm": 9.0, "weight_kg": 320,
            "power_max_kw": 10, "power_typical_kw": 4,
            "mcb_amp": 32, "ups_kva": 15, "cable_gauge_sqmm": 6, "mounting": "Wall Mount",
        }
        body = {
            "customer_id": customer_id, "project_name": "TEST_ITER5_QUOTE",
            "config": config,
            "items": [{"description": "LED Cabinet", "qty": 40, "unit": "Nos",
                       "unit_price": 45000, "total": 1800000}],
            "subtotal": 1800000, "gst_percent": 18, "gst_amount": 324000, "grand_total": 2124000,
            # extended fields
            "power_data": {"mcb_combo": "1 × 32A", "current_max_a": 24, "voltage": 400},
            "network_data": {"looping_strategy": "Vertical", "home_runs": 8, "cable_type": "CAT6 UTP"},
            "controller_data": {"model": "VX600", "max_pixels": 2600000, "output_ports": 6},
            "cover_intro": "Executive summary for TEST_ITER5 quote.",
            "pdf_sections": {"power": True, "network": True, "structural": False, "cover": True},
        }
        r = admin_session.post(f"{API}/quotes", json=body)
        assert r.status_code == 200, r.text
        q = r.json()
        assert q["power_data"]["mcb_combo"] == "1 × 32A"
        assert q["network_data"]["looping_strategy"] == "Vertical"
        assert q["controller_data"]["model"] == "VX600"
        assert q["cover_intro"].startswith("Executive summary")
        assert q["pdf_sections"]["power"] is True
        return q["id"]

    def test_quote_get_returns_extended_fields(self, admin_session, quote_id):
        r = admin_session.get(f"{API}/quotes/{quote_id}")
        assert r.status_code == 200
        q = r.json()
        assert q["power_data"]["mcb_combo"] == "1 × 32A"
        assert q["network_data"]["home_runs"] == 8
        assert q["controller_data"]["model"] == "VX600"
        assert q["cover_intro"]

    def test_quote_pdf_generates(self, admin_session, quote_id):
        r = admin_session.get(f"{API}/quotes/{quote_id}/pdf")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        content = r.content
        assert len(content) > 5000, f"PDF too small: {len(content)} bytes"
        assert content[:4] == b"%PDF", "Not a valid PDF header"


# ---------------- Regression smoke ----------------

class TestRegression:
    def test_login_admin(self, admin_session):
        r = admin_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_controllers_list(self, admin_session):
        r = admin_session.get(f"{API}/controllers")
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_products_list(self, admin_session):
        r = admin_session.get(f"{API}/products")
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_dashboard_stats(self, admin_session):
        r = admin_session.get(f"{API}/dashboard/stats")
        assert r.status_code == 200
        d = r.json()
        assert "total_quotations" in d
        assert "total_customers" in d

    def test_meta_roles(self, admin_session):
        r = admin_session.get(f"{API}/meta/roles")
        assert r.status_code == 200
        assert len(r.json()["roles"]) == 7

    def test_structural_endpoint(self, admin_session):
        r = admin_session.post(f"{API}/engineering/structural",
                               json={"total_weight_kg": 320, "wall_w_mm": 4000,
                                     "wall_h_mm": 2250, "total_cabinets": 40,
                                     "mount_type": "wall_mount"})
        assert r.status_code == 200
        d = r.json()
        assert "anchor_bolt_count" in d or "recommended_structure" in d
