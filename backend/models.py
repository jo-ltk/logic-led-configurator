"""Pydantic domain models."""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Any
from datetime import datetime, timezone
import uuid


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Users ----------
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "sales_executive"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    created_at: Optional[str] = None


# ---------- Products ----------
class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uuid)
    category: str  # Indoor / Outdoor / Rental / COB / Transparent / Creative
    series: str
    pixel_pitch: str  # P0.9, P1.2, ...
    name: str
    # Cabinet
    cabinet_width_mm: float
    cabinet_height_mm: float
    cabinet_depth_mm: float = 80
    cabinet_weight_kg: float = 8
    cabinet_material: str = "Die Cast"
    # LED specs
    brightness_nits: int = 800
    contrast_ratio: str = "5000:1"
    refresh_rate_hz: int = 3840
    viewing_angle: str = "160/160"
    power_max_w: float = 500
    power_typical_w: float = 200
    operating_voltage: str = "110-240V"
    ip_rating: str = "IP40"
    led_brand: str = "Nationstar"
    driver_ic: str = "ICN2038S"
    color_temp: str = "3200K-9300K"
    life_hours: int = 100000
    maintenance: str = "Front & Rear"
    # Pricing (INR)
    cabinet_price: float = 45000
    module_price: float = 0
    installation_cost_per_sqm: float = 5000
    structure_cost_per_sqm: float = 3000
    commissioning_cost: float = 25000
    packing_cost: float = 5000
    transport_cost: float = 15000
    amc_percent: float = 8
    warranty_years: int = 2
    # Media
    image_url: Optional[str] = None
    image_file_id: Optional[str] = None
    gallery_file_ids: List[str] = Field(default_factory=list)  # up to 4 product images
    reference_file_ids: List[str] = Field(default_factory=list)  # rendered / site / project
    spec_rows: List[dict] = Field(default_factory=list)  # user-added additional spec key/value
    certifications: List[str] = Field(default_factory=lambda: ["CE", "RoHS", "FCC", "BIS"])
    archived: bool = False
    created_at: str = Field(default_factory=_now)


# ---------- Customers ----------
class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uuid)
    company: str
    gst: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    industry: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    pin: Optional[str] = None
    contact_person: Optional[str] = None
    designation: Optional[str] = None
    remarks: Optional[str] = None
    created_at: str = Field(default_factory=_now)


# ---------- Partners ----------
class Partner(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uuid)
    name: str
    region: Optional[str] = None
    sales_manager: Optional[str] = None
    gst: Optional[str] = None
    pan: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    discount_level: float = 0
    credit_limit: float = 0
    created_at: str = Field(default_factory=_now)


# ---------- Quotes ----------
class QuoteConfig(BaseModel):
    """Configurator output snapshot."""
    product_id: str
    width_mm: float
    height_mm: float
    cabinets_x: int
    cabinets_y: int
    total_cabinets: int
    total_width_mm: float
    total_height_mm: float
    resolution_w: int
    resolution_h: int
    total_pixels: int
    diagonal_inch: float
    aspect_ratio: str
    led_area_sqm: float
    weight_kg: float
    power_max_kw: float
    power_typical_kw: float
    mcb_amp: float
    ups_kva: float
    cable_gauge_sqmm: float
    mounting: str = "Wall Mount"


class QuoteItem(BaseModel):
    key: Optional[str] = None
    description: str
    qty: float
    unit: str = "Nos"
    unit_price: float
    total: float


class QuoteCreate(BaseModel):
    customer_id: str
    partner_id: Optional[str] = None
    project_name: str
    industry: Optional[str] = None
    region: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    remarks: Optional[str] = None
    sales_person_id_override: Optional[str] = None
    config: QuoteConfig
    items: List[QuoteItem]
    subtotal: float
    gst_percent: float = 18
    gst_amount: float
    grand_total: float
    validity_days: int = 30
    # Extended engineering + PDF data (optional)
    power_data: Optional[dict] = None
    network_data: Optional[dict] = None
    controller_data: Optional[dict] = None
    render_file_id: Optional[str] = None
    cover_intro: Optional[str] = None
    pdf_sections: Optional[dict] = None


class Quote(QuoteCreate):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uuid)
    quote_number: str
    revision: int = 0
    status: str = "draft"  # draft / submitted / won / lost / cancelled
    sales_person_id: str
    sales_person_name: str
    created_at: str = Field(default_factory=_now)


# ---------- Settings ----------
class CompanySettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "default"
    company_name: str = "LOGIC LED Displays Pvt Ltd"
    address: str = "Plot 42, Electronics City, Bangalore 560100, India"
    gst: str = "29ABCDE1234F1Z5"
    email: str = "sales@logicled.com"
    phone: str = "+91 80 4000 1234"
    website: str = "www.logicled.com"
    bank_name: str = "HDFC Bank"
    account_number: str = "50100234567890"
    ifsc: str = "HDFC0001234"
    default_gst_percent: float = 18
    currency: str = "INR"
    quote_prefix: str = "LOGIC/Q"
    logo_url: Optional[str] = None
