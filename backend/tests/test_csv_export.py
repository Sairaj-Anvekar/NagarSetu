import csv
import io

from app.services.admin_complaint_service import build_csv, csv_safe


def test_csv_safe_cases() -> None:
    assert csv_safe("=1+1") == "'=1+1"
    assert csv_safe("+91 98765") == "'+91 98765"
    assert csv_safe("-5") == "'-5"
    assert csv_safe("@SUM(A1)") == "'@SUM(A1)"
    assert csv_safe("\tsome_value") == "'\tsome_value"
    assert csv_safe("\rsome_value") == "'\rsome_value"
    assert csv_safe(None) == ""
    assert csv_safe("Garbage near market") == "Garbage near market"
    assert csv_safe(123) == "123"


def test_build_csv_bom_and_roundtrip() -> None:
    data = [["tracking_code", "category"], ["NAGAR-1", "Solid Waste & Garbage"]]
    raw = build_csv(data)
    assert raw.startswith(b"\xef\xbb\xbf")

    header = ["tracking_code", "description"]
    desc = 'Garbage, "overflowing"\nnext line'
    complex_data = [header, ["NAGAR-2", desc]]

    raw_complex = build_csv(complex_data)
    text = raw_complex.decode("utf-8-sig")
    reader = list(csv.reader(io.StringIO(text)))
    assert reader == [header, ["NAGAR-2", desc]]


def test_build_csv_formula_injection_and_header_sanitization() -> None:
    data = [["=formula_header", "normal"], ["=cmd|' /C calc'!A0", "+91 98765"]]
    raw = build_csv(data)
    text = raw.decode("utf-8-sig")
    reader = list(csv.reader(io.StringIO(text)))

    assert reader[0][0] == "'=formula_header"
    assert reader[1][0] == "'=cmd|' /C calc'!A0"
    assert reader[1][1] == "'+91 98765"

