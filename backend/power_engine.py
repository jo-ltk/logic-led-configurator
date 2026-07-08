"""Power engineering — IEC/IS-informed calculations for LED walls."""
import math

# Indian standard MCB ratings (single-pole B/C curve). We only use these combos.
IN_MCB_RATINGS = [6, 10, 16, 20, 32]
# Indian RCCB standard ratings
IN_RCCB_RATINGS = [25, 40, 63, 80, 100]


def fit_mcb_indian(current_amp: float) -> dict:
    """Return combination of Indian standard MCBs that covers current with 25% margin.
    Prefer the smallest single-MCB rating that fits; else combine multiple identical.
    """
    target = current_amp * 1.25
    # Try single MCB
    for r in IN_MCB_RATINGS:
        if r >= target:
            return {"rating_a": r, "count": 1, "total_a": r, "combo": f"1 × {r}A"}
    # Combine: use highest 32A MCBs in parallel circuits
    per = IN_MCB_RATINGS[-1]  # 32A
    n = math.ceil(target / per)
    return {"rating_a": per, "count": n, "total_a": per * n, "combo": f"{n} × {per}A"}


def fit_rccb_indian(current_amp: float) -> int:
    target = current_amp * 1.25
    for r in IN_RCCB_RATINGS:
        if r >= target:
            return r
    return IN_RCCB_RATINGS[-1]


def power_calc(power_max_kw: float, power_typical_kw: float,
               voltage: int = 230, phase: str = "single",
               daily_hours: float = 10, tariff_inr_kwh: float = 8.5,
               days_per_month: int = 30) -> dict:
    if phase == "three":
        v_line = 400
        current_max = round((power_max_kw * 1000) / (math.sqrt(3) * v_line * 0.9), 2)
        current_typ = round((power_typical_kw * 1000) / (math.sqrt(3) * v_line * 0.9), 2)
    else:
        v_line = voltage
        current_max = round((power_max_kw * 1000) / (v_line * 0.9), 2)
        current_typ = round((power_typical_kw * 1000) / (v_line * 0.9), 2)

    mcb = fit_mcb_indian(current_max)
    rccb = fit_rccb_indian(current_max)

    def cable_gauge(a: float) -> float:
        if a <= 15: return 1.5
        if a <= 24: return 2.5
        if a <= 32: return 4
        if a <= 41: return 6
        if a <= 57: return 10
        if a <= 76: return 16
        if a <= 101: return 25
        if a <= 125: return 35
        if a <= 151: return 50
        if a <= 192: return 70
        if a <= 232: return 95
        return 120
    cable = cable_gauge(current_max)

    run_m = 30
    if phase == "three":
        vd = round((math.sqrt(3) * current_max * 0.0175 * run_m * 2) / cable, 2)
    else:
        vd = round((2 * current_max * 0.0175 * run_m * 2) / cable, 2)
    vd_percent = round((vd / v_line) * 100, 2)

    # Sockets ~ 1 per 16A loop
    per_loop_a = 16
    loops = max(1, math.ceil(current_max / per_loop_a))
    socket_type = "16A Industrial IP44 (5-pin CEE)"

    earth_pits = 2 if current_max > 25 else 1

    ups_kva = round(max(1.5, power_max_kw * 1.4), 2)
    ups_backup_min = 15
    ups_price = round(ups_kva * 12000, 0)

    gen_kva = round(power_max_kw * 1.4 + 3, 1)

    monthly_kwh = round(power_typical_kw * daily_hours * days_per_month, 1)
    monthly_cost = round(monthly_kwh * tariff_inr_kwh, 0)
    annual_cost = round(monthly_cost * 12, 0)

    return {
        "phase": phase, "voltage": v_line,
        "power_max_kw": power_max_kw, "power_typical_kw": power_typical_kw,
        "current_max_a": current_max, "current_typ_a": current_typ,
        "power_factor": 0.9,
        "mcb": mcb,
        "mcb_rating_a": mcb["rating_a"], "mcb_count": mcb["count"], "mcb_combo": mcb["combo"],
        "rccb_rating_a": rccb, "rccb_sensitivity_ma": 30,
        "cable_size_sqmm": cable, "voltage_drop_v": vd, "voltage_drop_percent": vd_percent,
        "socket_type": socket_type, "socket_count": loops, "socket_amp": per_loop_a,
        "power_loops": loops, "earth_pits": earth_pits,
        "ups_kva": ups_kva, "ups_backup_min": ups_backup_min, "ups_price_inr": ups_price,
        "generator_kva": gen_kva,
        "monthly_kwh": monthly_kwh, "monthly_cost_inr": monthly_cost, "annual_cost_inr": annual_cost,
        "daily_hours": daily_hours, "tariff_inr_kwh": tariff_inr_kwh,
        "notes": [
            "Design as per IEC 60364 / IS 732.",
            "MCB ratings per IS/IEC 60898 — B/C curve, 6/10/16/20/32 A only.",
            "RCCB 30 mA type A recommended for LED loads.",
            "Provide separate neutral & earth (TN-S).",
            "Verify actual site conditions before ordering.",
        ],
    }
