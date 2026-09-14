"""
Detection rules registry.

Each rule is a dict with:
  - pattern:    compiled regex that matches a suspicious log line
  - alert_type: AlertType enum value
  - severity:   AlertSeverity enum value
  - description: human-readable explanation shown in the UI
  - event_type: short label stored on the LogEntry

Rules are evaluated in order; the FIRST matching rule wins for severity
assignment, but ALL matching rules generate their own Alert rows so that
a single log line can trigger multiple alert types (e.g. brute-force AND
SSH failure).
"""

import re
from app.models.alert import AlertType, AlertSeverity

# ─────────────────────────────────────────────────────────────────────────────
# Compiled rule definitions
# ─────────────────────────────────────────────────────────────────────────────

DETECTION_RULES = [

    # ── 1. Failed Login (generic) ─────────────────────────────────────────────
    {
        "pattern": re.compile(
            r"(failed\s+(?:login|password|authentication))|"
            r"(authentication\s+failure)|"
            r"(invalid\s+(?:user|username|password))|"
            r"(login\s+failed)|"
            r"(incorrect\s+password)",
            re.IGNORECASE,
        ),
        "alert_type": AlertType.FAILED_LOGIN,
        "severity":   AlertSeverity.MEDIUM,
        "description": "Failed login attempt detected.",
        "event_type": "FAILED_LOGIN",
    },

    # ── 2. SSH Authentication Failure ─────────────────────────────────────────
    {
        "pattern": re.compile(
            r"(sshd.*failed|sshd.*invalid|sshd.*error)|"
            r"(failed\s+password\s+for\s+(?:invalid\s+user\s+)?\w+\s+from)|"
            r"(connection\s+closed\s+by\s+authenticating\s+user)|"
            r"(too\s+many\s+authentication\s+failures)|"
            r"(ssh.*authentication\s+fail)",
            re.IGNORECASE,
        ),
        "alert_type": AlertType.SSH_AUTH_FAILURE,
        "severity":   AlertSeverity.HIGH,
        "description": "SSH authentication failure detected.",
        "event_type": "SSH_AUTH_FAILURE",
    },

    # ── 3. SQL Injection ──────────────────────────────────────────────────────
    {
        "pattern": re.compile(
            r"(\bunion\b.+\bselect\b)|"
            r"(\bselect\b.+\bfrom\b.+\bwhere\b)|"
            r"(\bdrop\s+table\b)|"
            r"(\binsert\s+into\b.+\bvalues\b)|"
            r"(--\s*$)|"                          # SQL comment at end of input
            r"(;.{0,10}(drop|truncate|delete))|"
            r"(\bor\b\s+['\"]?1['\"]?\s*=\s*['\"]?1)|"   # OR 1=1
            r"(\bexec\s*\()|"
            r"(\bxp_cmdshell\b)|"
            r"(sleep\s*\(\s*\d+\s*\))",           # time-based blind SQLi
            re.IGNORECASE,
        ),
        "alert_type": AlertType.SQL_INJECTION,
        "severity":   AlertSeverity.CRITICAL,
        "description": "SQL injection attempt detected in log message.",
        "event_type": "SQL_INJECTION",
    },

    # ── 4. Cross-Site Scripting (XSS) ─────────────────────────────────────────
    {
        "pattern": re.compile(
            r"(<\s*script\b[^>]*>)|"
            r"(javascript\s*:)|"
            r"(on(?:load|click|mouseover|error|focus|blur|submit)\s*=)|"
            r"(<\s*img\b[^>]+\bonerror\b)|"
            r"(document\.(cookie|write|location))|"
            r"(eval\s*\()|"
            r"(alert\s*\(.*\))|"
            r"(<\s*iframe\b)|"
            r"(svg\s*onload\s*=)",
            re.IGNORECASE,
        ),
        "alert_type": AlertType.XSS,
        "severity":   AlertSeverity.HIGH,
        "description": "Cross-Site Scripting (XSS) payload detected.",
        "event_type": "XSS",
    },

    # ── 5. Brute Force ────────────────────────────────────────────────────────
    {
        "pattern": re.compile(
            r"(brute\s*force)|"
            r"(repeated\s+(?:login\s+)?attempt)|"
            r"(too\s+many\s+(?:failed\s+)?(?:login\s+)?attempts)|"
            r"(account\s+locked)|"
            r"(maximum\s+(?:login\s+)?retries)|"
            r"(login\s+rate\s+limit)",
            re.IGNORECASE,
        ),
        "alert_type": AlertType.BRUTE_FORCE,
        "severity":   AlertSeverity.CRITICAL,
        "description": "Brute force attack pattern detected.",
        "event_type": "BRUTE_FORCE",
    },

    # ── 6. Port Scan ──────────────────────────────────────────────────────────
    {
        "pattern": re.compile(
            r"(port\s+scan)|"
            r"(nmap)|"
            r"(masscan)|"
            r"(syn\s+flood)|"
            r"(connect\s+scan)|"
            r"(network\s+scan)|"
            r"(portsweep)|"
            r"(stealth\s+scan)|"
            r"(os\s+detection)|"
            r"(fingerprint\s+scan)",
            re.IGNORECASE,
        ),
        "alert_type": AlertType.PORT_SCAN,
        "severity":   AlertSeverity.MEDIUM,
        "description": "Port scanning activity detected.",
        "event_type": "PORT_SCAN",
    },

    # ── 7. Malware / Malicious keywords ───────────────────────────────────────
    {
        "pattern": re.compile(
            r"(malware|ransomware|trojan|rootkit|keylogger|spyware|adware|botnet)|"
            r"(virus\s+detected|infected\s+file|malicious\s+(?:file|code|payload))|"
            r"(c2\s+server|command\s+and\s+control)|"
            r"(reverse\s+shell|bind\s+shell|meterpreter)|"
            r"(mimikatz|metasploit|cobalt\s+strike|empire\s+framework)|"
            r"(powershell.*(-enc|-encodedcommand|-nop|-hidden))|"
            r"(wget\s+http|curl\s+http.*\|\s*(?:bash|sh|python))",
            re.IGNORECASE,
        ),
        "alert_type": AlertType.MALWARE,
        "severity":   AlertSeverity.CRITICAL,
        "description": "Malware or malicious tool keyword detected.",
        "event_type": "MALWARE",
    },

    # ── 8. Suspicious IP ──────────────────────────────────────────────────────
    {
        "pattern": re.compile(
            r"(suspicious\s+(?:ip|address|host|source))|"
            r"(blocked\s+(?:ip|host|address))|"
            r"(blacklisted\s+(?:ip|host))|"
            r"(threat\s+intelligence)|"
            r"(known\s+(?:bad|malicious)\s+(?:ip|actor))",
            re.IGNORECASE,
        ),
        "alert_type": AlertType.SUSPICIOUS_IP,
        "severity":   AlertSeverity.HIGH,
        "description": "Connection from a suspicious or blocked IP address.",
        "event_type": "SUSPICIOUS_IP",
    },

    # ── 9. Unauthorized Access ────────────────────────────────────────────────
    {
        "pattern": re.compile(
            r"(unauthorized\s+access)|"
            r"(access\s+denied)|"
            r"(permission\s+denied)|"
            r"(forbidden\s+(?:request|access|resource))|"
            r"(privilege\s+escalation)|"
            r"(sudo.*FAILED)|"
            r"(not\s+permitted)|"
            r"(illegal\s+(?:access|operation))|"
            r"(403\s+Forbidden)",
            re.IGNORECASE,
        ),
        "alert_type": AlertType.UNAUTHORIZED_ACCESS,
        "severity":   AlertSeverity.HIGH,
        "description": "Unauthorized access or privilege escalation attempt.",
        "event_type": "UNAUTHORIZED_ACCESS",
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# Severity mapping used when upgrading a LogEntry severity
# from the default INFO to whatever the matched rule demands
# ─────────────────────────────────────────────────────────────────────────────

SEVERITY_ORDER = {
    "INFO":     0,
    "LOW":      1,
    "MEDIUM":   2,
    "HIGH":     3,
    "CRITICAL": 4,
}
