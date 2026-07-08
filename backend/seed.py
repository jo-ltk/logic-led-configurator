"""Seed initial data — updated to new 7-role scheme + Novastar controllers."""
import os
import uuid
from datetime import datetime, timezone
from auth_utils import hash_password, verify_password
from db import db
from controllers_engine import NOVASTAR_CATALOG


SAMPLE_PRODUCTS = [
    {"category": "Indoor LED", "series": "LOGIC Indoor Pro", "pixel_pitch": "P1.5",
     "name": "LOGIC Indoor Pro P1.5", "cabinet_width_mm": 480, "cabinet_height_mm": 540,
     "cabinet_weight_kg": 7.5, "brightness_nits": 800, "power_max_w": 380, "power_typical_w": 150,
     "cabinet_price": 62000, "installation_cost_per_sqm": 4500},
    {"category": "Indoor LED", "series": "LOGIC Indoor Ultra", "pixel_pitch": "P1.2",
     "name": "LOGIC Indoor Ultra P1.2", "cabinet_width_mm": 600, "cabinet_height_mm": 337.5,
     "cabinet_weight_kg": 8, "brightness_nits": 700, "power_max_w": 320, "power_typical_w": 120,
     "cabinet_price": 78000, "installation_cost_per_sqm": 5500},
    {"category": "Indoor LED", "series": "LOGIC Indoor Pro", "pixel_pitch": "P2.5",
     "name": "LOGIC Indoor Pro P2.5", "cabinet_width_mm": 640, "cabinet_height_mm": 480,
     "cabinet_weight_kg": 8.5, "brightness_nits": 1000, "power_max_w": 400, "power_typical_w": 170,
     "cabinet_price": 42000, "installation_cost_per_sqm": 4000},
    {"category": "Outdoor LED", "series": "LOGIC Outdoor Max", "pixel_pitch": "P4",
     "name": "LOGIC Outdoor Max P4", "cabinet_width_mm": 960, "cabinet_height_mm": 960,
     "cabinet_weight_kg": 32, "cabinet_material": "Die Cast Aluminium",
     "brightness_nits": 6500, "power_max_w": 950, "power_typical_w": 380, "ip_rating": "IP65",
     "cabinet_price": 68000, "installation_cost_per_sqm": 6000},
    {"category": "Outdoor LED", "series": "LOGIC Outdoor Max", "pixel_pitch": "P6",
     "name": "LOGIC Outdoor Max P6", "cabinet_width_mm": 960, "cabinet_height_mm": 960,
     "cabinet_weight_kg": 30, "brightness_nits": 7500, "power_max_w": 900, "power_typical_w": 360,
     "ip_rating": "IP65", "cabinet_price": 54000, "installation_cost_per_sqm": 5500},
    {"category": "Rental LED", "series": "LOGIC Estilo", "pixel_pitch": "P2.9",
     "name": "LOGIC Estilo Rental P2.9", "cabinet_width_mm": 500, "cabinet_height_mm": 500,
     "cabinet_weight_kg": 6.8, "cabinet_material": "Die Cast Aluminium",
     "brightness_nits": 4500, "power_max_w": 450, "power_typical_w": 180,
     "cabinet_price": 58000, "installation_cost_per_sqm": 3500},
    {"category": "COB LED", "series": "LOGIC COB Luxe", "pixel_pitch": "P0.9",
     "name": "LOGIC COB Luxe P0.9", "cabinet_width_mm": 600, "cabinet_height_mm": 337.5,
     "cabinet_weight_kg": 9, "brightness_nits": 600, "power_max_w": 280, "power_typical_w": 110,
     "cabinet_price": 145000, "installation_cost_per_sqm": 7500},
    {"category": "Transparent LED", "series": "LOGIC Transparent", "pixel_pitch": "P3",
     "name": "LOGIC Transparent P3.9", "cabinet_width_mm": 1000, "cabinet_height_mm": 500,
     "cabinet_weight_kg": 12, "brightness_nits": 4000, "power_max_w": 200, "power_typical_w": 80,
     "cabinet_price": 92000, "installation_cost_per_sqm": 6500},
]

SAMPLE_CUSTOMERS = [
    {"company": "Infosys Ltd", "email": "facilities@infosys.com", "phone": "+91 80 2852 0261",
     "industry": "IT Services", "city": "Bangalore", "state": "Karnataka",
     "contact_person": "Ramesh Rao", "designation": "Facility Manager", "gst": "29AAACI4741L1ZE"},
    {"company": "Reliance Retail", "email": "avops@relianceretail.com", "phone": "+91 22 3555 5000",
     "industry": "Retail", "city": "Mumbai", "state": "Maharashtra",
     "contact_person": "Priya Shah", "designation": "AV Head", "gst": "27AABCR1718E1Z8"},
    {"company": "HDFC Bank", "email": "corp.av@hdfcbank.com", "phone": "+91 22 6652 1000",
     "industry": "BFSI", "city": "Mumbai", "state": "Maharashtra",
     "contact_person": "Vikram Nair", "designation": "IT Infrastructure", "gst": "27AAACH2702H1Z0"},
    {"company": "IIT Bombay", "email": "purchase@iitb.ac.in", "phone": "+91 22 2572 2545",
     "industry": "Education", "city": "Mumbai", "state": "Maharashtra",
     "contact_person": "Dr. A Sharma", "designation": "Dean", "gst": ""},
]

SAMPLE_PARTNERS = [
    {"name": "AVTech Solutions", "region": "South", "email": "sales@avtech.in", "phone": "+91 80 4111 2222",
     "gst": "29AABCA1234B1Z1", "discount_level": 12, "credit_limit": 5000000},
    {"name": "Prisma Systems Integrators", "region": "West", "email": "info@prismasi.in", "phone": "+91 22 4111 3333",
     "gst": "27AAECP5678C1Z2", "discount_level": 15, "credit_limit": 8000000},
    {"name": "NorthStar AV", "region": "North", "email": "contact@northstarav.in", "phone": "+91 11 4111 4444",
     "gst": "07AAFCN9012D1Z3", "discount_level": 10, "credit_limit": 3500000},
]

# 7-role user set
SAMPLE_USERS = [
    {"email": "admin2@logic.com", "password": "admin2123", "name": "Aarav Admin", "role": "admin"},
    {"email": "dealer@logic.com", "password": "dealer123", "name": "Deepak Dealer", "role": "dealer"},
    {"email": "sales@logic.com", "password": "sales123", "name": "Arjun Sales", "role": "sales"},
    {"email": "presales@logic.com", "password": "presales123", "name": "Karan Presales", "role": "presales"},
    {"email": "consultant@logic.com", "password": "consultant123", "name": "Chitra Consultant", "role": "consultant"},
    {"email": "customer@logic.com", "password": "customer123", "name": "Anita Customer", "role": "customer"},
]


async def seed_all():
    await db.users.create_index("email", unique=True)
    await db.products.create_index([("category", 1), ("pixel_pitch", 1)])
    await db.quotes.create_index("quote_number", unique=True)

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@logic.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    now = datetime.now(timezone.utc).isoformat()

    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Super Admin", "role": "super_admin", "created_at": now, "active": True,
        })
    else:
        # ensure super_admin role
        upd = {}
        if existing.get("role") != "super_admin": upd["role"] = "super_admin"
        if not verify_password(admin_password, existing["password_hash"]):
            upd["password_hash"] = hash_password(admin_password)
        if upd: await db.users.update_one({"email": admin_email}, {"$set": upd})

    # Migrate legacy roles to new set
    legacy_map = {
        "sales_manager": "sales", "sales_executive": "sales",
        "product_manager": "admin", "presales_engineer": "presales",
    }
    for old, new in legacy_map.items():
        await db.users.update_many({"role": old}, {"$set": {"role": new}})

    for u in SAMPLE_USERS:
        if not await db.users.find_one({"email": u["email"]}):
            await db.users.insert_one({
                "id": str(uuid.uuid4()), "email": u["email"],
                "password_hash": hash_password(u["password"]),
                "name": u["name"], "role": u["role"], "created_at": now, "active": True,
            })

    if await db.products.count_documents({}) == 0:
        from models import Product
        for p in SAMPLE_PRODUCTS:
            await db.products.insert_one(Product(**p).model_dump())

    if await db.customers.count_documents({}) == 0:
        from models import Customer
        for c in SAMPLE_CUSTOMERS:
            await db.customers.insert_one(Customer(**c).model_dump())

    if await db.partners.count_documents({}) == 0:
        from models import Partner
        for p in SAMPLE_PARTNERS:
            await db.partners.insert_one(Partner(**p).model_dump())

    # Novastar controllers
    if await db.controllers.count_documents({}) == 0:
        for c in NOVASTAR_CATALOG:
            await db.controllers.insert_one({
                "id": str(uuid.uuid4()),
                **c,
                "created_at": now,
            })

    from models import CompanySettings
    if not await db.settings.find_one({"id": "default"}):
        await db.settings.insert_one(CompanySettings().model_dump())
