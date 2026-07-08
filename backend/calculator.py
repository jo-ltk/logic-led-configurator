"""LED wall calculations engine."""
import math

# Pixel pitch -> mm
PITCH_MAP = {
    "P0.9": 0.9, "P1.2": 1.2, "P1.5": 1.5, "P1.8": 1.8,
    "P2": 2.0, "P2.5": 2.5, "P2.9": 2.9, "P3": 3.0, "P4": 4.0,
    "P5": 5.0, "P6": 6.0, "P8": 8.0, "P10": 10.0,
}


def pitch_mm(pixel_pitch: str) -> float:
    return PITCH_MAP.get(pixel_pitch, 2.5)


def to_mm(value: float, unit: str) -> float:
    u = unit.lower()
    if u in ("mm", "millimetres", "millimeters"): return value
    if u in ("cm", "centimetres", "centimeters"): return value * 10
    if u in ("m", "metres", "meters"): return value * 1000
    if u in ("ft", "feet"): return value * 304.8
    if u in ("in", "inches"): return value * 25.4
    return value


def calc_wall(product: dict, width_mm: float, height_mm: float) -> dict:
    cw = product["cabinet_width_mm"]
    ch = product["cabinet_height_mm"]
    pitch = pitch_mm(product["pixel_pitch"])

    cabinets_x = max(1, math.ceil(width_mm / cw))
    cabinets_y = max(1, math.ceil(height_mm / ch))
    total_cabinets = cabinets_x * cabinets_y

    total_w = cabinets_x * cw
    total_h = cabinets_y * ch

    res_w = int(round(total_w / pitch))
    res_h = int(round(total_h / pitch))

    diag_mm = math.hypot(total_w, total_h)
    diag_inch = round(diag_mm / 25.4, 1)

    from math import gcd
    g = gcd(int(total_w), int(total_h)) or 1
    ar = f"{int(total_w/g)}:{int(total_h/g)}"

    led_area = (total_w * total_h) / 1_000_000

    weight = total_cabinets * product["cabinet_weight_kg"]
    p_max_kw = round(total_cabinets * product["power_max_w"] / 1000, 2)
    p_typ_kw = round(total_cabinets * product["power_typical_w"] / 1000, 2)

    mcb_amp = math.ceil((p_max_kw * 1000 / 230) * 1.3)
    ups_kva = round(p_max_kw * 1.4, 2)
    cable = 4 if mcb_amp <= 32 else (6 if mcb_amp <= 40 else (10 if mcb_amp <= 63 else 16))

    return {
        "cabinets_x": cabinets_x, "cabinets_y": cabinets_y,
        "total_cabinets": total_cabinets,
        "total_width_mm": total_w, "total_height_mm": total_h,
        "resolution_w": res_w, "resolution_h": res_h,
        "total_pixels": res_w * res_h,
        "diagonal_inch": diag_inch, "aspect_ratio": ar,
        "led_area_sqm": round(led_area, 3),
        "weight_kg": round(weight, 1),
        "power_max_kw": p_max_kw, "power_typical_kw": p_typ_kw,
        "mcb_amp": mcb_amp, "ups_kva": ups_kva,
        "cable_gauge_sqmm": cable,
        "viewing_distance_min_m": round(pitch, 2),
        "viewing_distance_optimal_m": round(pitch * 2.5, 2),
        "viewing_distance_max_m": round(pitch * 5, 2),
        "heat_output_btu": round(p_typ_kw * 3412, 0),
    }


# ------------ BOQ ------------
# Each item has key/description/default_include flag so frontend can toggle
DEFAULT_INCLUDE = {
    "cabinet": True,
    "controller": True,           # sending card
    "video_processor": True,      # optional
    "mounting_frame": True,       # optional
    "installation": True,
    "power_signal_cabling": True, # optional
    "packing_transport": True,    # optional
    "spare_modules": True,        # optional (% variable)
    "mcb": False,                 # optional
    "ups": False,                 # optional
}


def build_boq(product: dict, wall: dict, settings: dict,
              include: dict | None = None, spare_percent: float = 2.0) -> list:
    inc = {**DEFAULT_INCLUDE, **(include or {})}
    items = []
    total_cab = wall["total_cabinets"]
    area = wall["led_area_sqm"]

    if inc.get("cabinet", True):
        items.append({
            "key": "cabinet",
            "description": f"{product['name']} — Cabinet ({product['cabinet_width_mm']}×{product['cabinet_height_mm']}mm, {product['pixel_pitch']})",
            "qty": total_cab, "unit": "Nos",
            "unit_price": product["cabinet_price"],
            "total": round(total_cab * product["cabinet_price"], 2),
        })
    if inc.get("controller"):
        items.append({"key": "controller", "description": "Sending Card / Controller",
                      "qty": 1, "unit": "Nos", "unit_price": 35000, "total": 35000})
    if inc.get("video_processor"):
        items.append({"key": "video_processor", "description": "Video Processor (Seamless Switcher)",
                      "qty": 1, "unit": "Nos", "unit_price": 85000, "total": 85000})
    if inc.get("mounting_frame"):
        items.append({"key": "mounting_frame", "description": "Mounting Frame & Structure",
                      "qty": area, "unit": "sqm",
                      "unit_price": product["structure_cost_per_sqm"],
                      "total": round(area * product["structure_cost_per_sqm"], 2)})
    if inc.get("installation"):
        items.append({"key": "installation", "description": "Installation & Commissioning",
                      "qty": area, "unit": "sqm",
                      "unit_price": product["installation_cost_per_sqm"],
                      "total": round(area * product["installation_cost_per_sqm"], 2)})
    if inc.get("power_signal_cabling"):
        items.append({"key": "power_signal_cabling", "description": "Power & Signal Cabling",
                      "qty": 1, "unit": "Lot", "unit_price": 25000, "total": 25000})
    if inc.get("packing_transport"):
        pt = product["packing_cost"] + product["transport_cost"]
        items.append({"key": "packing_transport", "description": "Packing & Transportation",
                      "qty": 1, "unit": "Lot", "unit_price": pt, "total": pt})
    if inc.get("spare_modules"):
        spare_qty = max(1, math.ceil(total_cab * (spare_percent or 0) / 100.0))
        items.append({"key": "spare_modules",
                      "description": f"Spare Modules ({spare_percent}% recommended)",
                      "qty": spare_qty, "unit": "Nos", "unit_price": 4500,
                      "total": round(spare_qty * 4500, 2)})
    if inc.get("mcb"):
        items.append({"key": "mcb",
                      "description": f"MCB Distribution Board — {wall['mcb_amp']}A rated",
                      "qty": 1, "unit": "Set", "unit_price": 18000, "total": 18000})
    if inc.get("ups"):
        items.append({"key": "ups",
                      "description": f"Online UPS — {wall['ups_kva']} kVA",
                      "qty": 1, "unit": "Nos",
                      "unit_price": round(wall['ups_kva'] * 12000, 0),
                      "total": round(wall['ups_kva'] * 12000, 0)})
    return items
