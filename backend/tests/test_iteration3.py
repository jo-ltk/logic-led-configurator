"""Iteration 3 tests: BOQ toggles, sales rep override, customers/partners aggregates and quotes-drill-down."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://logic-led-config.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@logic.com", "password": "admin123"}
EXEC = {"email": "exec@logic.com", "password": "exec123"}


def _login(creds):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return s, r.json()


@pytest.fixture(scope="session")
def admin_session():
    s, u = _login(ADMIN)
    return s, u


@pytest.fixture(scope="session")
def exec_session():
    s, u = _login(EXEC)
    return s, u


@pytest.fixture(scope="session")
def first_product(admin_session):
    s, _ = admin_session
    r = s.get(f"{API}/products", timeout=30)
    assert r.status_code == 200
    products = r.json()
    assert len(products) >= 1
    return products[0]


# ---------- Configurator ----------
class TestConfigure:
    def test_default_boq_excludes_receiving_card(self, admin_session, first_product):
        s, _ = admin_session
        r = s.post(f"{API}/configure", json={
            "product_id": first_product["id"], "width": 4, "height": 2.25, "unit": "m",
        })
        assert r.status_code == 200, r.text
        data = r.json()
        keys = [i.get("key") for i in data["items"]]
        assert "receiving_card" not in keys, f"receiving_card still present: {keys}"
        # Sanity — should have cabinet and controller
        assert "cabinet" in keys
        assert "controller" in keys

    def test_toggle_removes_item(self, admin_session, first_product):
        s, _ = admin_session
        r = s.post(f"{API}/configure", json={
            "product_id": first_product["id"], "width": 4, "height": 2.25, "unit": "m",
            "include": {"video_processor": False, "mounting_frame": False, "spare_modules": False,
                        "power_signal_cabling": False, "packing_transport": False,
                        "installation": True, "controller": True, "cabinet": True,
                        "mcb": False, "ups": False},
        })
        assert r.status_code == 200
        keys = [i.get("key") for i in r.json()["items"]]
        assert "video_processor" not in keys
        assert "mounting_frame" not in keys
        assert "spare_modules" not in keys
        assert "power_signal_cabling" not in keys

    def test_toggle_enables_mcb_ups(self, admin_session, first_product):
        s, _ = admin_session
        r = s.post(f"{API}/configure", json={
            "product_id": first_product["id"], "width": 4, "height": 2.25, "unit": "m",
            "include": {"mcb": True, "ups": True},
        })
        assert r.status_code == 200
        keys = [i.get("key") for i in r.json()["items"]]
        assert "mcb" in keys
        assert "ups" in keys

    def test_spare_percent_variable(self, admin_session, first_product):
        s, _ = admin_session
        r = s.post(f"{API}/configure", json={
            "product_id": first_product["id"], "width": 4, "height": 2.25, "unit": "m",
            "include": {"spare_modules": True}, "spare_percent": 5,
        })
        assert r.status_code == 200
        data = r.json()
        wall = data["wall"]
        total_cab = wall["total_cabinets"]
        expected = max(1, int(-(-total_cab * 5 // 100)))  # ceil
        spare = next((i for i in data["items"] if i.get("key") == "spare_modules"), None)
        assert spare is not None
        assert spare["qty"] == expected, f"expected {expected} got {spare['qty']} (total_cab={total_cab})"


# ---------- Users listing ----------
class TestUsersListing:
    def test_sales_executive_can_list_users(self, exec_session):
        s, _ = exec_session
        r = s.get(f"{API}/auth/users", params={"role": "sales_executive"}, timeout=30)
        # Must NOT be 403 anymore
        assert r.status_code == 200, f"exec should list users, got {r.status_code} {r.text}"
        for u in r.json():
            assert u["role"] == "sales_executive"

    def test_admin_can_list_all_users(self, admin_session):
        s, _ = admin_session
        r = s.get(f"{API}/auth/users", timeout=30)
        assert r.status_code == 200
        roles = {u["role"] for u in r.json()}
        assert "super_admin" in roles
        assert "sales_executive" in roles


# ---------- Aggregates ----------
class TestAggregates:
    def test_customers_have_count_value_won(self, admin_session):
        s, _ = admin_session
        r = s.get(f"{API}/customers", timeout=30)
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) >= 1
        for row in rows:
            assert "count" in row and isinstance(row["count"], int)
            assert "value" in row
            assert "won" in row and isinstance(row["won"], int)

    def test_partners_have_count_value_won(self, admin_session):
        s, _ = admin_session
        r = s.get(f"{API}/partners", timeout=30)
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) >= 1
        for row in rows:
            assert "count" in row
            assert "value" in row
            assert "won" in row

    def test_customer_quotes_endpoint(self, admin_session):
        s, _ = admin_session
        customers = s.get(f"{API}/customers").json()
        # Pick one with count > 0 if available, else first
        target = next((c for c in customers if c.get("count", 0) > 0), customers[0])
        r = s.get(f"{API}/customers/{target['id']}/quotes", timeout=30)
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list)
        if target.get("count", 0) > 0:
            assert len(arr) == target["count"]
            for q in arr:
                assert q["customer_id"] == target["id"]

    def test_partner_quotes_endpoint(self, admin_session):
        s, _ = admin_session
        partners = s.get(f"{API}/partners").json()
        if not partners:
            pytest.skip("no partners")
        target = next((p for p in partners if p.get("count", 0) > 0), partners[0])
        r = s.get(f"{API}/partners/{target['id']}/quotes", timeout=30)
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list)


# ---------- Quote creation with sales rep + partner override ----------
class TestQuoteCreation:
    def test_admin_creates_quote_with_override_rep_and_partner(self, admin_session, first_product):
        s, admin_user = admin_session
        # Find an executive user to attribute the quote to
        users = s.get(f"{API}/auth/users", params={"role": "sales_executive"}).json()
        assert len(users) >= 1
        target_rep = users[0]

        # Find a customer and a partner
        customers = s.get(f"{API}/customers").json()
        partners = s.get(f"{API}/partners").json()
        assert len(customers) >= 1
        assert len(partners) >= 1
        cust = customers[0]
        prt = partners[0]

        # Run configure to get valid config payload
        cfg = s.post(f"{API}/configure", json={
            "product_id": first_product["id"], "width": 4, "height": 2.25, "unit": "m",
        }).json()

        quote_config = {
            "product_id": first_product["id"],
            "width_mm": cfg["width_mm"], "height_mm": cfg["height_mm"],
            **cfg["wall"],
        }
        body = {
            "customer_id": cust["id"],
            "partner_id": prt["id"],
            "project_name": "TEST_ITER3_Boardroom",
            "sales_person_id_override": target_rep["id"],
            "config": quote_config,
            "items": cfg["items"],
            "subtotal": cfg["subtotal"],
            "gst_percent": cfg["gst_percent"],
            "gst_amount": cfg["gst_amount"],
            "grand_total": cfg["grand_total"],
            "validity_days": 30,
        }
        r = s.post(f"{API}/quotes", json=body, timeout=30)
        assert r.status_code == 200, f"create quote failed: {r.status_code} {r.text}"
        q = r.json()
        assert q["sales_person_id"] == target_rep["id"], \
            f"expected override to {target_rep['id']}, got {q['sales_person_id']}"
        assert q["sales_person_name"] == target_rep["name"]
        assert q["partner_id"] == prt["id"]
        # Also: item keys retained
        keys = [i.get("key") for i in q["items"]]
        assert "receiving_card" not in keys

        # cleanup
        try:
            s.delete(f"{API}/quotes/{q['id']}")
        except Exception:
            pass

    def test_exec_cannot_override_rep(self, exec_session, admin_session, first_product):
        s_exec, exec_user = exec_session
        s_admin, _ = admin_session
        users = s_admin.get(f"{API}/auth/users").json()
        other = next((u for u in users if u["id"] != exec_user["id"]), None)
        assert other is not None
        customers = s_admin.get(f"{API}/customers").json()
        cfg = s_exec.post(f"{API}/configure", json={
            "product_id": first_product["id"], "width": 4, "height": 2.25, "unit": "m",
        }).json()
        quote_config = {
            "product_id": first_product["id"],
            "width_mm": cfg["width_mm"], "height_mm": cfg["height_mm"],
            **cfg["wall"],
        }
        body = {
            "customer_id": customers[0]["id"],
            "project_name": "TEST_ITER3_ExecOverride",
            "sales_person_id_override": other["id"],  # exec tries to reassign
            "config": quote_config,
            "items": cfg["items"],
            "subtotal": cfg["subtotal"],
            "gst_percent": cfg["gst_percent"],
            "gst_amount": cfg["gst_amount"],
            "grand_total": cfg["grand_total"],
            "validity_days": 30,
        }
        r = s_exec.post(f"{API}/quotes", json=body, timeout=30)
        assert r.status_code == 200
        q = r.json()
        # exec's own id must be used, override ignored
        assert q["sales_person_id"] == exec_user["id"], \
            f"exec's override should be ignored, but sales_person_id={q['sales_person_id']} (exec.id={exec_user['id']})"
        # cleanup via admin
        s_admin.delete(f"{API}/quotes/{q['id']}")
