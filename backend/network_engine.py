"""CAT6 / Fiber network engineering — vertical (indoor) / horizontal (outdoor) looping."""
import math


def network_calc(cabinets_x: int, cabinets_y: int, controller_ports: int,
                 pixels_per_port: int, total_pixels: int,
                 cabinet_pitch_mm: float = 500, run_length_m: float = 30,
                 environment: str = "indoor", pixels_per_cabinet: int | None = None) -> dict:
    """Compute home runs following LED-industry looping practice.
    - Indoor: vertical looping — one loop per column, split column into 2 if exceeds capacity.
    - Outdoor: horizontal looping — one loop per row, split row into 2 if exceeds capacity.
    """
    total_cabinets = cabinets_x * cabinets_y

    if not pixels_per_cabinet or pixels_per_cabinet <= 0:
        pixels_per_cabinet = max(1, total_pixels // max(1, total_cabinets))

    # Cabinets per port based on the controller
    caps_per_port = max(1, pixels_per_port // pixels_per_cabinet)

    if environment == "indoor":
        # Vertical looping: one loop per column
        col_pixels = cabinets_y * pixels_per_cabinet
        if col_pixels <= pixels_per_port:
            home_runs = cabinets_x
            cabinets_per_run_avg = cabinets_y
            split_note = "One loop per column (full-column vertical loop)."
        else:
            # split each column into 2 halves
            home_runs = cabinets_x * 2
            cabinets_per_run_avg = math.ceil(cabinets_y / 2)
            split_note = "Each column split into 2 half-column loops due to port capacity."
    else:  # outdoor
        row_pixels = cabinets_x * pixels_per_cabinet
        if row_pixels <= pixels_per_port:
            home_runs = cabinets_y
            cabinets_per_run_avg = cabinets_x
            split_note = "One loop per row (full-row horizontal loop)."
        else:
            home_runs = cabinets_y * 2
            cabinets_per_run_avg = math.ceil(cabinets_x / 2)
            split_note = "Each row split into 2 half-row loops due to port capacity."

    # If exceeds controller ports, use 100% ports and note deficit
    ports_deficit = max(0, home_runs - controller_ports)
    if ports_deficit > 0:
        note_ports = f"Requires {home_runs} ports — pick controller with ≥{home_runs} ports (deficit {ports_deficit})."
    else:
        note_ports = "Within controller port capacity."

    # Cable type
    if run_length_m <= 60:
        cable_type = "CAT6 UTP"
    elif run_length_m <= 100:
        cable_type = "CAT6A STP"
    else:
        cable_type = "Fiber (Single Mode) with OEO Converters"

    cable_length_m = round(home_runs * run_length_m * 1.15, 1)

    patch_cords = max(0, total_cabinets - home_runs)
    fiber_needed = run_length_m > 100
    fiber_converter_pairs = home_runs if fiber_needed else 0

    rj45 = home_runs * 2 + 4

    switch_ports = max(8, math.ceil(home_runs * 1.3))

    return {
        "environment": environment,
        "cabinets_x": cabinets_x, "cabinets_y": cabinets_y,
        "total_cabinets": total_cabinets, "total_pixels": total_pixels,
        "pixels_per_cabinet": pixels_per_cabinet,
        "controller_ports": controller_ports,
        "pixels_per_port": pixels_per_port,
        "caps_per_port": caps_per_port,
        "home_runs": home_runs,
        "cabinets_per_run": cabinets_per_run_avg,
        "cable_type": cable_type,
        "cable_length_m": cable_length_m,
        "patch_cords": patch_cords,
        "rj45_connectors": rj45,
        "fiber_converter_pairs": fiber_converter_pairs,
        "network_switch_ports": switch_ports,
        "controller_ports_used": min(home_runs, controller_ports),
        "controller_ports_free": max(0, controller_ports - home_runs),
        "ports_deficit": ports_deficit,
        "looping_strategy": ("Vertical" if environment == "indoor" else "Horizontal"),
        "split_note": split_note,
        "port_note": note_ports,
        "signal_flow": [
            "Media Source → Sending Card / Master Controller",
            f"Master → {home_runs}× {cable_type} runs ({'vertical' if environment=='indoor' else 'horizontal'} loops)",
            "Cabinet-to-cabinet daisy chain (CAT6 loop-in / loop-out)",
            "Loop back to controller for redundancy monitoring",
        ],
        "notes": [
            "Max single cable run: 100m for CAT6, 90m for CAT6A shielded.",
            "Use fiber for runs > 100m; use OEO converters at both ends.",
            "Enable redundancy loop-back on last cabinet in each run.",
            f"Environment: {environment} → {('vertical column' if environment=='indoor' else 'horizontal row')} looping applied.",
        ],
    }
