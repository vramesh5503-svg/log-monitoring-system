"""
Log line parser — extracts structured fields from raw log strings.

Supports common formats:
  • syslog   : Jan 15 14:32:01 hostname sshd[1234]: message
  • apache   : 127.0.0.1 - - [15/Jan/2024:14:32:01 +0000] "GET /path" 200 512
  • nginx    : same as apache
  • auth.log : timestamp hostname process[pid]: message
  • generic  : any line with an optional ISO timestamp prefix
"""

import re
from datetime import datetime, timezone
from typing import Optional
from app.utils.helpers import extract_ip


# ── Timestamp patterns ────────────────────────────────────────────────────────

_TS_ISO = re.compile(
    r"(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)"
)
_TS_SYSLOG = re.compile(
    r"([A-Za-z]{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})"
)
_TS_APACHE = re.compile(
    r"\[(\d{2}/[A-Za-z]{3}/\d{4}:\d{2}:\d{2}:\d{2}\s[+-]\d{4})\]"
)

# ── Apache/Nginx combined log format ─────────────────────────────────────────
_APACHE_RE = re.compile(
    r'(?P<ip>\S+)\s+'          # client IP
    r'\S+\s+\S+\s+'            # ident, authuser (usually - -)
    r'\[(?P<ts>[^\]]+)\]\s+'   # [timestamp]
    r'"(?P<request>[^"]+)"\s+' # "METHOD /path HTTP/1.x"
    r'(?P<status>\d{3})\s+'    # status code
    r'(?P<size>\S+)'            # response size
)

# ── Syslog format ─────────────────────────────────────────────────────────────
_SYSLOG_RE = re.compile(
    r'(?P<month>[A-Za-z]{3})\s+'
    r'(?P<day>\s*\d{1,2})\s+'
    r'(?P<time>\d{2}:\d{2}:\d{2})\s+'
    r'(?P<host>\S+)\s+'
    r'(?P<process>\S+?)(?:\[(?P<pid>\d+)\])?:\s+'
    r'(?P<message>.*)'
)


def _parse_apache_ts(ts_str: str) -> Optional[datetime]:
    try:
        return datetime.strptime(ts_str, "%d/%b/%Y:%H:%M:%S %z")
    except ValueError:
        return None


def _parse_syslog_ts(month: str, day: str, time_str: str) -> Optional[datetime]:
    try:
        year = datetime.now(timezone.utc).year
        raw = f"{year} {month} {day.strip()} {time_str}"
        return datetime.strptime(raw, "%Y %b %d %H:%M:%S").replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def _parse_iso_ts(ts_str: str) -> Optional[datetime]:
    # Normalise Z suffix and missing colons in tz offset
    ts_str = ts_str.replace("Z", "+00:00").replace("T", " ")
    formats = [
        "%Y-%m-%d %H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M:%S.%f%z",
        "%Y-%m-%d %H:%M:%S.%f",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(ts_str[:26], fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return None


# ── Public API ────────────────────────────────────────────────────────────────

class ParsedLogLine:
    """Result of parsing a single raw log line."""

    __slots__ = ("timestamp", "message", "source_ip", "source", "raw_line")

    def __init__(
        self,
        timestamp: Optional[datetime],
        message: str,
        source_ip: Optional[str],
        source: Optional[str],
        raw_line: str,
    ):
        self.timestamp = timestamp or datetime.now(timezone.utc)
        self.message   = message
        self.source_ip = source_ip
        self.source    = source
        self.raw_line  = raw_line


def parse_line(line: str, source_name: str = "unknown") -> ParsedLogLine:
    """
    Parse a single raw log line into a *ParsedLogLine*.

    Tries Apache → syslog → ISO timestamp → generic fallback in that order.
    """
    line = line.strip()
    if not line:
        return ParsedLogLine(None, line, None, source_name, line)

    # ── Apache / Nginx ────────────────────────────────────────────────────────
    m = _APACHE_RE.match(line)
    if m:
        ts  = _parse_apache_ts(m.group("ts"))
        req = m.group("request")
        ip  = m.group("ip") if m.group("ip") != "-" else None
        return ParsedLogLine(ts, req, ip, source_name, line)

    # ── Syslog ────────────────────────────────────────────────────────────────
    m = _SYSLOG_RE.match(line)
    if m:
        ts  = _parse_syslog_ts(m.group("month"), m.group("day"), m.group("time"))
        msg = m.group("message")
        ip  = extract_ip(msg)
        return ParsedLogLine(ts, msg, ip, source_name, line)

    # ── ISO timestamp prefix ──────────────────────────────────────────────────
    m = _TS_ISO.search(line)
    if m:
        ts  = _parse_iso_ts(m.group(1))
        msg = line[m.end():].lstrip(" -|:\t")
        ip  = extract_ip(line)
        return ParsedLogLine(ts, msg or line, ip, source_name, line)

    # ── Generic fallback ──────────────────────────────────────────────────────
    ip = extract_ip(line)
    return ParsedLogLine(None, line, ip, source_name, line)
