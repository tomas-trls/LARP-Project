"""
A read-only "look inside the database" page, for development only.

    http://localhost:8000/dev/tables          every table and how many rows it has
    http://localhost:8000/dev/tables/user     the rows of one table

It is not part of the real product API, so it does not appear on /docs.
Two safety rules:
  - password hashes are never shown;
  - it only answers requests coming from your own computer.
"""

from html import escape

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from sqlalchemy import func, select
from sqlmodel import Session, SQLModel

from app.database import get_session

ROW_LIMIT = 200  # show at most this many rows per table
HIDDEN_COLUMNS = {"password_hash"}
LOCAL_HOSTS = {"127.0.0.1", "::1", "localhost", "testclient"}  # "testclient" is used by the tests

PAGE_STYLE = """
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; color: #222; }
  table { border-collapse: collapse; font-size: 14px; }
  th, td { border: 1px solid #ccc; padding: 4px 10px; text-align: left; vertical-align: top; }
  th { background: #f0f0f0; position: sticky; top: 0; }
  tr:nth-child(even) td { background: #fafafa; }
  .muted { color: #777; }
</style>
"""


def only_from_this_computer(request: Request):
    """Route guard: answer 404 to anyone who is not on this computer."""
    if request.client is None or request.client.host not in LOCAL_HOSTS:
        raise HTTPException(status_code=404)


# dependencies=[...] runs the guard before every route in this router.
router = APIRouter(prefix="/dev", include_in_schema=False, dependencies=[Depends(only_from_this_computer)])


def page(title: str, body: str) -> HTMLResponse:
    return HTMLResponse(f"<!doctype html><html><head><title>{escape(title)}</title>{PAGE_STYLE}</head><body>{body}</body></html>")


def tables_by_name() -> dict:
    """Every table we have defined in models.py, by name."""
    from app import models  # noqa: F401  (importing makes sure every table is registered)

    return dict(SQLModel.metadata.tables)


@router.get("/tables", response_class=HTMLResponse)
def list_tables(session: Session = Depends(get_session)):
    """All tables with their row counts."""
    rows = ""
    for name, table in sorted(tables_by_name().items()):
        count = session.execute(select(func.count()).select_from(table)).scalar()
        rows += f'<tr><td><a href="/dev/tables/{escape(name)}">{escape(name)}</a></td><td>{count}</td></tr>'
    body = f"<h1>LARP database</h1><p class='muted'>Read-only. Development only.</p><table><tr><th>Table</th><th>Rows</th></tr>{rows}</table>"
    return page("LARP database", body)


@router.get("/tables/{name}", response_class=HTMLResponse)
def show_table(name: str, session: Session = Depends(get_session)):
    """The rows of one table."""
    table = tables_by_name().get(name)
    if table is None:
        raise HTTPException(status_code=404, detail=f"No table called '{name}'.")

    total = session.execute(select(func.count()).select_from(table)).scalar()
    result = session.execute(select(table).limit(ROW_LIMIT))
    columns = list(result.keys())

    head = "".join(f"<th>{escape(c)}</th>" for c in columns)
    body_rows = ""
    for row in result.all():
        cells = ""
        for column, value in zip(columns, row):
            shown = "[hidden]" if column in HIDDEN_COLUMNS else str(value)
            cells += f"<td>{escape(shown)}</td>"
        body_rows += f"<tr>{cells}</tr>"

    note = f"showing the first {ROW_LIMIT} of {total}" if total > ROW_LIMIT else f"{total} rows"
    body = (
        f'<p><a href="/dev/tables">&larr; all tables</a></p>'
        f"<h1>{escape(name)} <span class='muted'>({note})</span></h1>"
        f"<table><tr>{head}</tr>{body_rows}</table>"
    )
    return page(name, body)
