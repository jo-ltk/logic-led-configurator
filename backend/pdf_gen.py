"""Professional PDF quotation generator with cover page, spec sheet, engineering."""
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

BRAND = colors.HexColor("#0A1F44")
ACCENT = colors.HexColor("#007AFF")
MUTED = colors.HexColor("#6B7280")
LIGHT = colors.HexColor("#F9FAFB")


def _styles():
    ss = getSampleStyleSheet()
    ss.add(ParagraphStyle("H1", parent=ss["Heading1"], fontSize=26, textColor=BRAND, spaceAfter=8))
    ss.add(ParagraphStyle("H2", parent=ss["Heading2"], fontSize=14, textColor=BRAND, spaceAfter=6))
    ss.add(ParagraphStyle("H3", parent=ss["Heading3"], fontSize=11, textColor=BRAND, spaceAfter=4))
    ss.add(ParagraphStyle("Muted", parent=ss["Normal"], fontSize=9, textColor=MUTED))
    ss.add(ParagraphStyle("Body", parent=ss["Normal"], fontSize=10, leading=14))
    ss.add(ParagraphStyle("BodyJust", parent=ss["Normal"], fontSize=10, leading=14, alignment=TA_JUSTIFY))
    return ss


def _header_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(BRAND)
    canvas.setLineWidth(2)
    canvas.line(15 * mm, 285 * mm, 195 * mm, 285 * mm)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.setFillColor(BRAND)
    canvas.drawString(15 * mm, 288 * mm, "LOGIC LED DISPLAYS")
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(195 * mm, 288 * mm, "Confidential Quotation")
    canvas.setFont("Helvetica", 8)
    canvas.drawString(15 * mm, 10 * mm, "www.logicled.com • sales@logicled.com • +91 80 4000 1234")
    canvas.drawRightString(195 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


def _kv_table(rows, col_widths=(70 * mm, 100 * mm)):
    t = Table(rows, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def generate_quote_pdf(quote: dict, product: dict, customer: dict, settings: dict,
                       power: dict | None = None, network: dict | None = None,
                       controller: dict | None = None,
                       render_image_bytes: bytes | None = None,
                       product_image_bytes: bytes | None = None,
                       cover_intro: str | None = None,
                       sections: dict | None = None) -> bytes:
    """Generate PDF with selectable sections.
    sections: dict of {section_name: bool} — which sections to include.
    """
    sec = {
        "cover": True, "exec_summary": True, "technical": True,
        "power": True, "network": True, "spec_sheet": True,
        "render": True, "bom": True, "terms": True,
    }
    if sections: sec.update(sections)

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=15 * mm, rightMargin=15 * mm,
        topMargin=25 * mm, bottomMargin=18 * mm,
        title=f"Quotation {quote['quote_number']}"
    )
    ss = _styles()
    story = []

    # === COVER PAGE ===
    if sec.get("cover"):
        story.append(Spacer(1, 24 * mm))
        story.append(Paragraph("QUOTATION", ss["H1"]))
        story.append(Paragraph(f"<b>Reference:</b> {quote['quote_number']}", ss["Body"]))
        story.append(Paragraph(f"<b>Project:</b> {quote['project_name']}", ss["Body"]))
        story.append(Paragraph(f"<b>Date:</b> {quote['created_at'][:10]}", ss["Body"]))
        story.append(Paragraph(f"<b>Validity:</b> {quote['validity_days']} days", ss["Body"]))
        story.append(Spacer(1, 12 * mm))

        intro = cover_intro or settings.get("cover_intro") or (
            f"{settings['company_name']} is a premier manufacturer and integrator of "
            f"active LED videowalls in India — trusted by leading enterprises, government "
            f"institutions and system integrators for mission-critical display solutions. "
            f"This proposal outlines the recommended configuration, engineering design, "
            f"and commercial offer for the referenced project."
        )
        story.append(Paragraph("<b>ABOUT US</b>", ss["Muted"]))
        story.append(Paragraph(intro, ss["BodyJust"]))
        story.append(Spacer(1, 12 * mm))

        story.append(Paragraph("<b>PREPARED FOR</b>", ss["Muted"]))
        story.append(Paragraph(customer.get("company", "-"), ss["H2"]))
        story.append(Paragraph(customer.get("address", "") or "", ss["Body"]))
        if customer.get("contact_person"):
            story.append(Paragraph(f"Attn: {customer['contact_person']} ({customer.get('designation','')})", ss["Body"]))
        story.append(Spacer(1, 10 * mm))
        story.append(Paragraph("<b>PREPARED BY</b>", ss["Muted"]))
        story.append(Paragraph(settings["company_name"], ss["Body"]))
        story.append(Paragraph(settings["address"], ss["Body"]))
        story.append(Paragraph(f"Sales Person: {quote['sales_person_name']}", ss["Body"]))
        story.append(PageBreak())

    # === EXECUTIVE SUMMARY ===
    if sec.get("exec_summary"):
        story.append(Paragraph("Executive Summary", ss["H2"]))
        cfg = quote["config"]
        summary = f"""We propose the <b>{product['name']}</b> LED Videowall for
<b>{quote['project_name']}</b>. The configuration delivers a
<b>{cfg['total_width_mm']/1000:.2f}m × {cfg['total_height_mm']/1000:.2f}m</b> display
({cfg['diagonal_inch']}") with a total resolution of
<b>{cfg['resolution_w']} × {cfg['resolution_h']}</b> pixels using
<b>{cfg['total_cabinets']}</b> cabinets of pixel pitch <b>{product['pixel_pitch']}</b>.
Brightness {product['brightness_nits']} nits, aspect ratio {cfg['aspect_ratio']},
total LED area {cfg['led_area_sqm']} sqm."""
        story.append(Paragraph(summary, ss["BodyJust"]))
        story.append(Spacer(1, 8))

    if sec.get("render") and render_image_bytes:
        try:
            story.append(Paragraph("Visualization", ss["H3"]))
            img_stream = BytesIO(render_image_bytes)
            story.append(Image(img_stream, width=170 * mm, height=95 * mm, kind="proportional"))
            story.append(Spacer(1, 8))
        except Exception:
            pass

    # === TECHNICAL CONFIGURATION ===
    if sec.get("technical"):
        story.append(Paragraph("Technical Configuration", ss["H2"]))
        cfg = quote["config"]
        tech = [["Parameter", "Value"],
                ["Product Series", product["series"]],
                ["Pixel Pitch", product["pixel_pitch"]],
                ["Cabinets (W × H)", f"{cfg['cabinets_x']} × {cfg['cabinets_y']} = {cfg['total_cabinets']}"],
                ["Display Size", f"{cfg['total_width_mm']:.0f} × {cfg['total_height_mm']:.0f} mm ({cfg['diagonal_inch']}\")"],
                ["Resolution", f"{cfg['resolution_w']} × {cfg['resolution_h']} px"],
                ["Aspect Ratio", cfg["aspect_ratio"]],
                ["LED Area", f"{cfg['led_area_sqm']} sqm"],
                ["Brightness", f"{product['brightness_nits']} nits"],
                ["Refresh Rate", f"{product['refresh_rate_hz']} Hz"],
                ["Total Weight", f"{cfg['weight_kg']} kg"],
                ["Max Power", f"{cfg['power_max_kw']} kW"],
                ["Typical Power", f"{cfg['power_typical_kw']} kW"],
                ]
        if controller:
            tech.append(["Recommended Controller", f"{controller.get('model')} ({controller.get('class', '')})"])
        story.append(_kv_table(tech))
        story.append(Spacer(1, 10))

    # === POWER SECTION ===
    if sec.get("power") and power:
        def _s(v, suffix=""):
            if v is None: return "-"
            return f"{v}{suffix}"
        def _money(v):
            try: return f"₹ {float(v):,.0f}" if v is not None else "-"
            except Exception: return "-"
        story.append(Paragraph("Power Engineering", ss["H2"]))
        prows = [["Parameter", "Value"],
                 ["Phase / Voltage", f"{str(power.get('phase','single')).title()} / {_s(power.get('voltage'), ' V')}"],
                 ["Current (Max)", _s(power.get('current_max_a'), ' A')],
                 ["Current (Typical)", _s(power.get('current_typ_a'), ' A')],
                 ["Power Factor", _s(power.get('power_factor'))],
                 ["MCB", f"{power.get('mcb_combo') or str(power.get('mcb_rating_a','-'))+'A'} (IS 60898 B/C-curve)"],
                 ["RCCB", f"{_s(power.get('rccb_rating_a'),' A')} / {_s(power.get('rccb_sensitivity_ma'),' mA')}"],
                 ["Cable Size", _s(power.get('cable_size_sqmm'), ' sqmm Cu')],
                 ["Voltage Drop", f"{_s(power.get('voltage_drop_v'),' V')} ({_s(power.get('voltage_drop_percent'),'%')})"],
                 ["Sockets", f"{_s(power.get('socket_count'))} × {_s(power.get('socket_amp'),'A')} ({power.get('socket_type','-')})"],
                 ["Earth Pits", _s(power.get('earth_pits'))],
                 ["UPS", f"{_s(power.get('ups_kva'),' kVA')} / {_s(power.get('ups_backup_min'),' min')}"],
                 ["Generator", _s(power.get('generator_kva'), ' kVA')],
                 ["Monthly Consumption", _s(power.get('monthly_kwh'), ' kWh')],
                 ["Monthly Running Cost", _money(power.get('monthly_cost_inr'))],
                 ["Annual Running Cost", _money(power.get('annual_cost_inr'))]]
        story.append(_kv_table(prows))
        story.append(Spacer(1, 10))

    # === NETWORK SECTION ===
    if sec.get("network") and network:
        def _n(v, suffix=""):
            if v is None: return "-"
            return f"{v}{suffix}"
        story.append(Paragraph("Network / CAT6 Cable Requirements", ss["H2"]))
        tp = network.get('total_pixels')
        nrows = [["Parameter", "Value"],
                 ["Environment", str(network.get('environment', '-')).title()],
                 ["Matrix", f"{_n(network.get('cabinets_x'))} × {_n(network.get('cabinets_y'))} = {_n(network.get('total_cabinets'))} cabinets"],
                 ["Resolution", f"{quote['config']['resolution_w']} × {quote['config']['resolution_h']} px ({tp:,} pixels)" if tp else f"{quote['config']['resolution_w']} × {quote['config']['resolution_h']} px"],
                 ["Looping Strategy", network.get('looping_strategy', '-')],
                 ["Home Runs", _n(network.get('home_runs'))],
                 ["Cabinets / Run", _n(network.get('cabinets_per_run'))],
                 ["Cable Type", network.get('cable_type', '-')],
                 ["Cable Length (incl. 15% spare)", _n(network.get('cable_length_m'), ' m')],
                 ["Patch Cords (0.5m)", _n(network.get('patch_cords'))],
                 ["RJ45 Connectors", _n(network.get('rj45_connectors'))],
                 ["Fiber Converter Pairs", _n(network.get('fiber_converter_pairs'))],
                 ["Network Switch Ports", _n(network.get('network_switch_ports'))],
                 ["Controller Ports Used", _n(network.get('controller_ports_used'))],
                 ["Controller Ports Free", _n(network.get('controller_ports_free'))]]
        story.append(_kv_table(nrows))
        story.append(Paragraph(f"<i>{network.get('split_note','')}</i>", ss["Muted"]))
        story.append(Spacer(1, 10))

    # === SPEC SHEET ===
    if sec.get("spec_sheet"):
        story.append(PageBreak())
        story.append(Paragraph("Product Specification Sheet", ss["H2"]))
        story.append(Paragraph(product["name"], ss["H3"]))
        if product_image_bytes:
            try:
                img_stream = BytesIO(product_image_bytes)
                story.append(Image(img_stream, width=100 * mm, height=60 * mm, kind="proportional"))
                story.append(Spacer(1, 6))
            except Exception:
                pass
        spec_rows = [["Specification", "Value"],
                     ["Model / Series", f"{product['name']} / {product['series']}"],
                     ["Category", product["category"]],
                     ["Pixel Pitch", product["pixel_pitch"]],
                     ["Cabinet Dimensions", f"{product['cabinet_width_mm']} × {product['cabinet_height_mm']} × {product.get('cabinet_depth_mm', 80)} mm"],
                     ["Cabinet Weight", f"{product['cabinet_weight_kg']} kg"],
                     ["Cabinet Material", product.get("cabinet_material", "Die Cast")],
                     ["Brightness", f"{product['brightness_nits']} nits"],
                     ["Contrast Ratio", product.get("contrast_ratio", "5000:1")],
                     ["Refresh Rate", f"{product['refresh_rate_hz']} Hz"],
                     ["Viewing Angle", product.get("viewing_angle", "160/160")],
                     ["Max Power", f"{product['power_max_w']} W/cabinet"],
                     ["Typical Power", f"{product['power_typical_w']} W/cabinet"],
                     ["Operating Voltage", product.get("operating_voltage", "110-240V")],
                     ["IP Rating", product.get("ip_rating", "IP40")],
                     ["LED Brand", product.get("led_brand", "-")],
                     ["Driver IC", product.get("driver_ic", "-")],
                     ["Color Temperature", product.get("color_temp", "3200-9300K")],
                     ["Life Hours", f"{product.get('life_hours', 100000):,} hrs"],
                     ["Maintenance", product.get("maintenance", "Front & Rear")],
                     ["Warranty", f"{product.get('warranty_years', 2)} year(s)"]]
        story.append(_kv_table(spec_rows))
        story.append(Spacer(1, 10))

    # === BOM ===
    if sec.get("bom"):
        story.append(PageBreak())
        story.append(Paragraph("Bill of Materials & Commercial Offer", ss["H2"]))
        boq = [["#", "Description", "Qty", "Unit", "Rate (INR)", "Amount (INR)"]]
        for i, item in enumerate(quote["items"], 1):
            boq.append([str(i), item["description"], f"{item['qty']:g}", item["unit"],
                        f"{item['unit_price']:,.0f}", f"{item['total']:,.0f}"])
        boq.append(["", "Subtotal", "", "", "", f"{quote['subtotal']:,.0f}"])
        boq.append(["", f"GST @ {quote['gst_percent']}%", "", "", "", f"{quote['gst_amount']:,.0f}"])
        boq.append(["", "GRAND TOTAL", "", "", "", f"INR {quote['grand_total']:,.0f}"])

        t = Table(boq, colWidths=[10 * mm, 78 * mm, 15 * mm, 15 * mm, 25 * mm, 32 * mm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BRAND),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8.5),
            ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
            ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
            ("BACKGROUND", (0, -3), (-1, -1), LIGHT),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ("TEXTCOLOR", (0, -1), (-1, -1), BRAND),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(t)
        story.append(Spacer(1, 12))

    # === TERMS ===
    if sec.get("terms"):
        story.append(Paragraph("Terms & Conditions", ss["H2"]))
        terms = [
            "Payment: 50% advance, 40% before dispatch, 10% after commissioning.",
            f"Warranty: {product.get('warranty_years', 2)} year(s) on cabinet & LED modules.",
            "Delivery: 4-6 weeks from receipt of PO and advance.",
            "GST @ 18% applicable as per government norms.",
            f"Validity of this quotation: {quote['validity_days']} days from date of issue.",
            "Site readiness, civil work, and electrical infrastructure are in customer scope.",
            "Prices are ex-works Bangalore. Freight & insurance extra as actual unless specified.",
        ]
        for tt in terms:
            story.append(Paragraph(f"• {tt}", ss["Body"]))
        story.append(Spacer(1, 20))
        story.append(Paragraph("<b>Thank you for the opportunity.</b>", ss["Body"]))
        story.append(Paragraph(f"For {settings['company_name']}", ss["Body"]))
        story.append(Spacer(1, 30))
        story.append(Paragraph(quote["sales_person_name"], ss["Body"]))
        story.append(Paragraph("Authorized Signatory", ss["Muted"]))

    doc.build(story, onFirstPage=_header_footer, onLaterPages=_header_footer)
    return buf.getvalue()
