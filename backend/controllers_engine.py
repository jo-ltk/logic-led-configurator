"""Novastar controller engine — capacities + auto-planning for LED walls."""
import math

# Reference: Novastar spec (loading capacity in pixels)
NOVASTAR_CATALOG = [
    {"model": "VX600", "class": "All-in-One", "max_pixels": 3_900_000, "output_ports": 6, "pixels_per_port": 650_000,
     "features": ["Video Processing", "Sending Card Built-in", "PIP", "Preview"], "price": 145000},
    {"model": "VX1000", "class": "All-in-One", "max_pixels": 6_500_000, "output_ports": 10, "pixels_per_port": 650_000,
     "features": ["4K Input", "Genlock", "Dual Power"], "price": 235000},
    {"model": "VX16S", "class": "All-in-One", "max_pixels": 10_400_000, "output_ports": 16, "pixels_per_port": 650_000,
     "features": ["Large-scale", "12-bit", "HDR"], "price": 425000},
    {"model": "MX20", "class": "Master Controller", "max_pixels": 13_000_000, "output_ports": 20, "pixels_per_port": 650_000,
     "features": ["8K Input", "Frame Sync", "Multi-modal"], "price": 385000},
    {"model": "MX40 Pro", "class": "Master Controller", "max_pixels": 26_000_000, "output_ports": 40, "pixels_per_port": 650_000,
     "features": ["10 Gigabit", "Redundancy", "Fiber"], "price": 785000},
    {"model": "H2", "class": "Video Processor", "max_pixels": 4_000_000, "output_ports": 4, "pixels_per_port": 1_000_000,
     "features": ["Modular", "6-Layer", "PIP/POP"], "price": 265000},
    {"model": "H5", "class": "Video Processor", "max_pixels": 8_000_000, "output_ports": 8, "pixels_per_port": 1_000_000,
     "features": ["Modular", "Scaling", "Preview"], "price": 465000},
    {"model": "CX40", "class": "Independent Controller", "max_pixels": 26_000_000, "output_ports": 40, "pixels_per_port": 650_000,
     "features": ["Cost-effective", "Fiber ready"], "price": 325000},
    {"model": "MCTRL660", "class": "Independent Controller", "max_pixels": 2_300_000, "output_ports": 4, "pixels_per_port": 650_000,
     "features": ["Legacy", "1080p60"], "price": 65000},
]


def plan_controller(total_pixels: int, prefer_class: str | None = None) -> dict:
    """Auto-pick the smallest controller that fits, or combine masters."""
    candidates = [c for c in NOVASTAR_CATALOG if c["max_pixels"] >= total_pixels]
    if prefer_class:
        pref = [c for c in candidates if c["class"] == prefer_class]
        if pref: candidates = pref
    if candidates:
        pick = sorted(candidates, key=lambda x: (x["max_pixels"], x["price"]))[0]
        ports_used = max(1, math.ceil(total_pixels / pick["pixels_per_port"]))
        return {
            "recommended": pick, "quantity": 1,
            "ports_used": ports_used, "ports_free": pick["output_ports"] - ports_used,
            "utilization_percent": round(total_pixels / pick["max_pixels"] * 100, 1),
            "note": "Single controller sufficient.",
        }
    # Combine using MX40 Pro
    big = next(c for c in NOVASTAR_CATALOG if c["model"] == "MX40 Pro")
    qty = math.ceil(total_pixels / big["max_pixels"])
    return {
        "recommended": big, "quantity": qty,
        "ports_used": math.ceil(total_pixels / big["pixels_per_port"]),
        "ports_free": qty * big["output_ports"] - math.ceil(total_pixels / big["pixels_per_port"]),
        "utilization_percent": round(total_pixels / (qty * big["max_pixels"]) * 100, 1),
        "note": f"Wall exceeds single unit — {qty} × {big['model']} recommended with genlock.",
    }
