"""Turns the files in "LARP-Project/Sample data" into small JSON files the front end can load.

Run it from the project root whenever the sample files change:

    python3 frontend/scripts/build_sample_data.py

It only uses Python's standard library (no installs). An .xlsx file is really a zip of XML files,
so we read the XML directly.

Writes to frontend/src/data/:
    events.json          Students' Union "What's Happening" events  (UCL "What's Happening".csv)
    careerEvents.json    UCL Careers events and sessions            (UCL Career Events & Opportunities.xlsx)
    careerServices.json  UCL Careers appointment types              (UCL Careers available services.xlsx)
    societies.json       Student clubs and societies                (Student groups.xlsx)
"""

import csv
import json
import re
import zipfile
from datetime import date, datetime, timedelta
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[2]  # LARP-Project/
SOURCE = ROOT / "Sample data"
OUT = ROOT / "frontend" / "src" / "data"

# Only keep events from this date on. The demo "today" is in the week of 12 October 2026.
FROM_DATE = "2026-10-12"

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_NS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"


def read_xlsx(path):
    """Returns {sheet name: list of rows}, where each row is a list of cell values (text or numbers)."""
    with zipfile.ZipFile(path) as z:
        # Text cells point into one shared list of strings.
        shared = []
        if "xl/sharedStrings.xml" in z.namelist():
            root = ElementTree.fromstring(z.read("xl/sharedStrings.xml"))
            for si in root.findall("m:si", NS):
                shared.append("".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t")))

        # Match each sheet name to its XML file.
        workbook = ElementTree.fromstring(z.read("xl/workbook.xml"))
        rels = ElementTree.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        targets = {r.get("Id"): r.get("Target") for r in rels}

        sheets = {}
        for sheet in workbook.find("m:sheets", NS):
            target = targets[sheet.get(REL_NS)].lstrip("/")
            target = target if target.startswith("xl/") else "xl/" + target
            root = ElementTree.fromstring(z.read(target))
            rows = []
            for row in root.iter(f"{{{NS['m']}}}row"):
                values = {}
                for cell in row.findall("m:c", NS):
                    column = re.match(r"[A-Z]+", cell.get("r")).group()
                    index = 0
                    for ch in column:
                        index = index * 26 + (ord(ch) - 64)
                    v = cell.find("m:v", NS)
                    text = v.text if v is not None else None
                    if cell.get("t") == "s" and text is not None:
                        text = shared[int(text)]
                    elif cell.get("t") == "inlineStr":
                        text = "".join(t.text or "" for t in cell.iter(f"{{{NS['m']}}}t"))
                    values[index - 1] = text
                width = max(values) + 1 if values else 0
                rows.append([values.get(i) for i in range(width)])
            sheets[sheet.get("name")] = rows
        return sheets


def as_dicts(rows, first_column=None):
    """Turns rows into dicts using one row as the column names. Skips empty rows.
    If first_column is given, the header is the first row that starts with that name
    (some sheets have a title and notes above the table)."""
    header_row = 0
    if first_column:
        header_row = next(i for i, r in enumerate(rows) if r and r[0] == first_column)
    header = [str(h).strip() if h else "" for h in rows[header_row]]
    out = []
    for row in rows[header_row + 1 :]:
        if not any(row):
            continue
        out.append({header[i]: row[i] for i in range(min(len(header), len(row))) if header[i]})
    return out


def excel_date(value):
    """Excel stores dates as a number of days since 1899-12-30. Returns 'YYYY-MM-DD'."""
    if value in (None, ""):
        return ""
    try:
        return (date(1899, 12, 30) + timedelta(days=float(value))).isoformat()
    except ValueError:
        return str(value)[:10]


def excel_time(value):
    """Excel stores a time as a fraction of a day. Returns 'HH:MM'."""
    if value in (None, ""):
        return ""
    try:
        minutes = round(float(value) * 24 * 60)
        return f"{minutes // 60:02d}:{minutes % 60:02d}"
    except ValueError:
        return str(value)[:5]


def clean(text, limit=None):
    text = re.sub(r"\s+", " ", str(text or "")).strip()
    if limit and len(text) > limit:
        text = text[: limit - 1].rsplit(" ", 1)[0] + "…"
    return text


def build_events():
    path = SOURCE / "UCL \"What's Happening\".csv"
    with open(path, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    events = []
    for r in rows:
        if r["Start date"] < FROM_DATE or r["Status"].lower().startswith("cancel"):
            continue
        events.append(
            {
                "id": r["Event ID"],
                "date": r["Start date"],
                "day": r["Day"],
                "start": r["Start time"],
                "end": r["End time"],
                "title": clean(r["Event title"]),
                "organiser": clean(r["Organiser"]).replace("Students' Union UCL – ", "SU · "),
                "location": clean(r["Location"]),
                "category": r["Category"],
                "audience": r["Audience"],
                "booking": clean(r["Booking / ticket note"]),
            }
        )
    events.sort(key=lambda e: (e["date"], e["start"]))
    return events


def build_career_events():
    sheet = read_xlsx(SOURCE / "UCL Career Events & Opportunities.xlsx")["All Sessions"]
    events = []
    for r in as_dicts(sheet):
        day = excel_date(r.get("Date"))
        if day < FROM_DATE:
            continue
        events.append(
            {
                "id": f"CE-{r.get('Event No.')}-{clean(r.get('Session')).split(' ')[0] or 1}",
                "date": day,
                "day": clean(r.get("Day")),
                "start": excel_time(r.get("Start Time")),
                "end": excel_time(r.get("End Time")),
                "title": clean(r.get("Event Title")),
                "series": clean(r.get("Event Series / Programme")),
                "mode": clean(r.get("Delivery Mode")),
                "location": clean(r.get("Venue / Location (as listed)")),
                "description": clean(r.get("Description"), 220),
                "organisation": clean(r.get("Featured Organisation (logo shown)")),
            }
        )
    events.sort(key=lambda e: (e["date"], e["start"]))
    return events


def build_career_services():
    sheets = read_xlsx(SOURCE / "UCL Careers available services.xlsx")
    # The sheet has notes under the table, so only keep rows whose ID is a number.
    captured = {
        r["ID"]: r
        for r in as_dicts(sheets["Appointment Types"], first_column="ID")
        if str(r.get("ID") or "").replace(".0", "").isdigit()
    }
    advice = {r["ID"]: r for r in as_dicts(sheets["App Design – Advisor View"], first_column="ID") if r.get("ID")}
    services = []
    for key, r in captured.items():
        a = advice.get(key, {})
        services.append(
            {
                "id": key,
                "name": clean(r.get("Appointment Name")),
                "offeredBy": clean(r.get("Offered By")),
                "description": clean(r.get("Description (as shown, truncated)"), 220),
                "duration": clean(r.get("Duration (stated)")),
                "mode": clean(r.get("Delivery Mode")),
                "button": clean(a.get("Suggested Button Label")),
                "stage": clean(a.get("Career Stage Fit")),
                "need": clean(a.get("Student Need / Intent")),
                "trigger": clean(a.get("Home-page Trigger (show as suggested action when…)")),
                "prep": clean(a.get("Prep Prompt to Show Before Booking")),
                "priority": int(float(a["Suggested Priority on Home Page (1=highest)"]))
                if a.get("Suggested Priority on Home Page (1=highest)") not in (None, "")
                else 99,
            }
        )
    services.sort(key=lambda s: s["priority"])
    return services


def build_societies():
    sheet = read_xlsx(SOURCE / "Student groups.xlsx")["All Groups"]
    groups = []
    for r in as_dicts(sheet):
        name = clean(r.get("Group Name"))
        if not name:
            continue
        cats = [c.strip() for c in str(r.get("Categories") or "").split(";") if c.strip()]
        groups.append({"name": name, "categories": cats, "description": clean(r.get("Description"), 160)})
    return groups


def write(name, data):
    OUT.mkdir(parents=True, exist_ok=True)
    with open(OUT / name, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{name}: {len(data)} items")


if __name__ == "__main__":
    write("events.json", build_events())
    write("careerEvents.json", build_career_events())
    write("careerServices.json", build_career_services())
    write("societies.json", build_societies())
    print(f"Done at {datetime.now():%H:%M}. Files are in {OUT}")
