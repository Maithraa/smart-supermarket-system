import pymysql
import pymysql.cursors
from decimal import Decimal
import datetime
from config import Config

def connect():
    return pymysql.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
        charset='utf8mb4'
    )

def _sanitize_row(row):
    if not row:
        return row
    clean = {}
    for k, v in row.items():
        if isinstance(v, Decimal):
            clean[k] = float(v)
        elif isinstance(v, (datetime.datetime, datetime.date)):
            clean[k] = v.isoformat()
        else:
            clean[k] = v
    return clean

def query(sql, args=(), one=False):
    c = connect()
    try:
        with c.cursor() as cur:
            cur.execute(sql, args)
            if one:
                row = cur.fetchone()
                return _sanitize_row(row) if row else None
            rows = cur.fetchall()
            return [_sanitize_row(r) for r in rows]
    finally:
        c.close()

def execute(sql, args=()):
    c = connect()
    try:
        with c.cursor() as cur:
            cur.execute(sql, args)
            return cur.lastrowid
    finally:
        c.close()

def execute_count(sql, args=()):
    c = connect()
    try:
        with c.cursor() as cur:
            cur.execute(sql, args)
            return cur.rowcount
    finally:
        c.close()
