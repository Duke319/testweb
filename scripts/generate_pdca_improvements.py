import json
import math
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path

import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[1]
PDCA_DIR = ROOT_DIR / "data" / "raw" / "employee-performance-system" / "PDCA"
PERFORMANCE_FILE = ROOT_DIR / "data" / "worker-performance-monthly.json"
OUTPUT_FILE = ROOT_DIR / "data" / "pdca-improvements.json"
MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def clean_text(value):
    if value is None:
        return ""
    if isinstance(value, float) and math.isnan(value):
        return ""
    text = str(value).strip()
    return "" if text.lower() == "nan" else text


def clean_number(value):
    number = pd.to_numeric(value, errors="coerce")
    if pd.isna(number):
        return 0
    return float(number)


def clean_bool(value):
    if isinstance(value, bool):
        return value
    if pd.isna(value):
        return False
    text = str(value).strip().lower()
    return text in {"true", "1", "yes", "y", "approved", "已审批", "通过"}


def clean_employee_no(value):
    text = clean_text(value)
    if text.endswith(".0"):
        text = text[:-2]
    return text


def clean_date(value):
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return ""
    parsed = pd.to_datetime(value, errors="coerce")
    if pd.isna(parsed):
        return ""
    return parsed.date().isoformat()


def parse_month_label(label):
    text = clean_text(label)
    parts = text.split()
    if len(parts) != 2 or parts[1] not in MONTH_NAMES:
        return 0
    return int(parts[0]) * 100 + MONTH_NAMES.index(parts[1]) + 1


def month_from_date(value):
    parsed = pd.to_datetime(value, errors="coerce")
    if pd.isna(parsed):
        return "", "", 0, 0
    year = str(parsed.year)
    month_number = int(parsed.month)
    return year, f"{year} {MONTH_NAMES[month_number - 1]}", month_number, int(year) * 100 + month_number


def normalize_project_type(value):
    text = clean_text(value)
    if text.upper() == "PDCA":
        return "pdca"
    if text in {"快改", "Kaizen", "KAIZEN"}:
        return "kaizen"
    if text.lower().replace(" ", "_") in {"near_miss", "nearmiss"}:
        return "near_miss"
    return ""


def read_performance_records():
    if not PERFORMANCE_FILE.exists():
        return []
    payload = json.loads(PERFORMANCE_FILE.read_text(encoding="utf-8"))
    return [
        record
        for record in payload.get("records", [])
        if record.get("month") and not record.get("isTotal") and record.get("employeeName") != "Total"
    ]


def build_lookup(records):
    by_no = defaultdict(list)
    by_name = defaultdict(list)
    for record in records:
        month_index = parse_month_label(record.get("month"))
        indexed = {**record, "_month_index": month_index}
        employee_no = clean_employee_no(record.get("employeeNo"))
        employee_name = clean_text(record.get("employeeName"))
        if employee_no:
            by_no[employee_no].append(indexed)
        if employee_name:
            by_name[employee_name].append(indexed)

    for bucket in [by_no, by_name]:
        for key in bucket:
            bucket[key].sort(key=lambda item: item["_month_index"])
    return by_no, by_name


def closest_record(records, month_index):
    if not records:
        return None
    same_month = [record for record in records if record["_month_index"] == month_index]
    if same_month:
        return same_month[-1]
    before = [record for record in records if record["_month_index"] <= month_index]
    if before:
        return before[-1]
    return records[-1]


def resolve_employee_match(operator_no, operator_name, month_index, by_no, by_name):
    if operator_no and by_no.get(operator_no):
        return closest_record(by_no[operator_no], month_index), "employeeNo"
    if operator_name and by_name.get(operator_name):
        return closest_record(by_name[operator_name], month_index), "employeeName"
    return None, ""


def fallback_business_area_and_plant(line_area):
    text = clean_text(line_area)
    if text in {"MFM1", "MFM2", "HzP/MFM1", "HzP/MFM2"}:
        return "Tools", "101"
    return "", ""


def build_record(row, source_file, index, by_no, by_name):
    year, month, month_number, month_index = month_from_date(row.get("creat_date"))
    operator_no = clean_employee_no(row.get("operator_no"))
    operator_name = clean_text(row.get("operator_name"))
    matched, matched_by = resolve_employee_match(operator_no, operator_name, month_index, by_no, by_name)
    fallback_business_area, fallback_plant = fallback_business_area_and_plant(row.get("line_area"))
    project_type = clean_text(row.get("project_type"))
    improvement_type = normalize_project_type(project_type)
    project_id = clean_text(row.get("project_id")) or clean_text(row.get("id")) or f"{source_file}:{index + 1}"
    approved = clean_bool(row.get("approved"))
    business_area = clean_text(matched.get("businessArea")) if matched else fallback_business_area
    plant = clean_text(matched.get("plant")) if matched else fallback_plant
    employee_name = clean_text(matched.get("employeeName")) if matched else operator_name
    employee_no = clean_employee_no(matched.get("employeeNo")) if matched else operator_no
    shift = clean_text(matched.get("shift")) if matched else ""
    employee_key = clean_text(matched.get("employeeKey")) if matched else (employee_no or operator_name)

    return {
        "id": project_id,
        "sourceFile": source_file,
        "sourceRow": index + 2,
        "projectId": project_id,
        "projectTitle": clean_text(row.get("project_title")),
        "projectType": project_type,
        "improvementType": improvement_type,
        "improveType": clean_text(row.get("improve_type")),
        "improveItem": clean_text(row.get("improve_item")),
        "operatorNo": operator_no,
        "operatorName": operator_name,
        "executeOperatorNo": clean_employee_no(row.get("executeOperatorNo")),
        "executeOperatorName": clean_text(row.get("executeOperatorName")),
        "employeeNo": employee_no,
        "employeeName": employee_name,
        "employeeKey": employee_key,
        "matchedBy": matched_by,
        "matchedPerformanceMonth": clean_text(matched.get("month")) if matched else "",
        "businessArea": business_area,
        "plant": plant,
        "department": clean_text(matched.get("department")) if matched else "",
        "workshop": clean_text(matched.get("workshop")) if matched else "",
        "shift": shift,
        "sourceDepartment": clean_text(row.get("department")),
        "lineArea": clean_text(row.get("line_area")),
        "station": clean_text(row.get("station")),
        "createdDate": clean_date(row.get("creat_date")),
        "startDate": clean_date(row.get("start_date")),
        "completeDate": clean_date(row.get("complete_date")),
        "approvedDate": clean_date(row.get("approvedDate")),
        "approveDate": clean_date(row.get("approveDate")),
        "approved": approved,
        "approvalStep": clean_text(row.get("approval_step")),
        "year": year,
        "month": month,
        "monthNumber": month_number,
        "quantity": 1,
        "benefitAmount": round(clean_number(row.get("costSavingTotal")), 2),
        "costSavingThisYear": round(clean_number(row.get("costSavingThisYear")), 2),
        "costSavingNextYear": round(clean_number(row.get("costSavingNextYear")), 2),
        "costSavingTotal": round(clean_number(row.get("costSavingTotal")), 2),
    }


def build_payload():
    files = sorted(PDCA_DIR.glob("*.xlsx"))
    performance_records = read_performance_records()
    by_no, by_name = build_lookup(performance_records)
    records = []

    for file in files:
        frame = pd.read_excel(file, sheet_name="data")
        for index, row in frame.iterrows():
            records.append(build_record(row, file.name, index, by_no, by_name))

    approved_records = [record for record in records if record["approved"]]
    return {
        "source": {
            "type": "pdca_improvements",
            "rawDirectory": str(PDCA_DIR.relative_to(ROOT_DIR)),
            "generatedAt": datetime.now().isoformat(timespec="seconds"),
            "fileCount": len(files),
            "files": [file.name for file in files],
            "monthBasis": "creat_date",
            "metricRule": "approved records only; PDCA maps to pdca, 快改 maps to kaizen",
        },
        "summary": {
            "rowCount": len(records),
            "approvedRowCount": len(approved_records),
            "pdcaCount": sum(1 for record in approved_records if record["improvementType"] == "pdca"),
            "kaizenCount": sum(1 for record in approved_records if record["improvementType"] == "kaizen"),
            "matchedEmployeeCount": sum(1 for record in records if record["matchedBy"]),
        },
        "records": records,
    }


def main():
    if not PDCA_DIR.exists():
        raise FileNotFoundError(f"PDCA directory not found: {PDCA_DIR}")
    payload = build_payload()
    OUTPUT_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(payload["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
