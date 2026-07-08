"""Structural engineering — mount type, wall load, anchor bolts."""
import math


def structural_calc(total_weight_kg: float, wall_w_mm: float, wall_h_mm: float,
                    total_cabinets: int, mount_type: str = "wall_mount") -> dict:
    """Recommend structure, calculate loads and anchor bolts."""
    area_sqm = (wall_w_mm * wall_h_mm) / 1_000_000
    load_per_sqm = round(total_weight_kg / max(area_sqm, 0.01), 1)

    # Frame steel weight (approx: 12 kg per sqm of area for standard MS frame)
    frame_weight = round(area_sqm * 12, 1)

    total_load = round(total_weight_kg + frame_weight, 1)

    # Anchor bolts — 4 bolts per 4 sqm minimum, M12 stud anchors
    bolts = max(6, math.ceil(area_sqm * 4))
    bolt_spec = "M12 × 100mm stainless steel stud anchor (Hilti HST3 or equivalent)"

    # Wall pull-out load per bolt (safety factor 4)
    load_per_bolt = round(total_load / bolts * 4, 1)  # design load

    # Recommend structure
    if mount_type == "hanging":
        structure = "Suspended truss with certified rigging (min 5:1 SWL)"
        clearance = 800
    elif mount_type == "floor_stand":
        structure = "Free-standing steel structure with base plate + counterweight"
        clearance = 600
    elif mount_type == "wall_mount":
        if total_load > 500:
            structure = "MS box-section frame (75×75×3mm) bolted to RCC wall"
        else:
            structure = "MS angle frame (50×50×5mm) bolted to wall"
        clearance = 400
    else:
        structure = "Custom structure — consult engineering"
        clearance = 600

    # Maintenance space (front / rear)
    maintenance_front_mm = 800 if "front" in mount_type else 400
    maintenance_rear_mm = 800

    # Automatic recommendation
    recommended_mount = "wall_mount"
    if total_load > 800: recommended_mount = "floor_stand"
    if wall_h_mm > 4000 and mount_type == "wall_mount":
        recommended_mount = "floor_stand or reinforced wall_mount"

    return {
        "wall_area_sqm": round(area_sqm, 2),
        "total_weight_kg": total_weight_kg,
        "frame_weight_kg": frame_weight,
        "total_load_kg": total_load,
        "load_per_sqm": load_per_sqm,
        "anchor_bolt_count": bolts,
        "anchor_bolt_spec": bolt_spec,
        "design_load_per_bolt_kg": load_per_bolt,
        "recommended_structure": structure,
        "recommended_mount_type": recommended_mount,
        "maintenance_space_front_mm": maintenance_front_mm,
        "maintenance_space_rear_mm": maintenance_rear_mm,
        "service_clearance_mm": clearance,
        "notes": [
            "Wall must be RCC / structural masonry. Confirm with civil engineer.",
            "For gypsum / drywall, use through-bolts with backing plate.",
            "Get structural sign-off before installation.",
        ],
    }
