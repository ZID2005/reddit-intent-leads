import json
import logging
import os
from datetime import datetime, timezone

class JsonFormatter(logging.Formatter):
    """
    Custom formatter that formats python LogRecord objects into structured JSON strings.
    """
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "component": record.name,
            "message": record.getMessage(),
        }

        # Extract extra context fields passed in logger.info("msg", extra={"key": "val"})
        standard_attrs = {
            'args', 'asctime', 'created', 'exc_info', 'exc_text', 'filename',
            'funcName', 'levelname', 'levelno', 'lineno', 'module', 'msecs',
            'message', 'msg', 'name', 'pathname', 'process', 'processName',
            'relativeCreated', 'stack_info', 'thread', 'threadName'
        }
        
        extra = {k: v for k, v in record.__dict__.items() if k not in standard_attrs}
        
        # Redact secrets from extra metadata to prevent leaks in production logs
        redact_keys = {"key", "secret", "token", "password", "authorization", "api_key"}
        if extra:
            clean_extra = {}
            for k, v in extra.items():
                if any(rk in k.lower() for rk in redact_keys):
                    clean_extra[k] = "[REDACTED]"
                else:
                    clean_extra[k] = v
            log_data["metadata"] = clean_extra

        # Include exception tracebacks if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data, ensure_ascii=False)

def setup_logging():
    """
    Configures the root logger to use structured JSON logging.
    Removes existing handlers to avoid duplicate log outputs.
    """
    root_logger = logging.getLogger()
    
    # Set logging level (default to INFO)
    log_level_str = os.getenv("LOG_LEVEL", "INFO").upper()
    log_level = getattr(logging, log_level_str, logging.INFO)
    root_logger.setLevel(log_level)

    # Clear pre-existing handlers
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    # Create console handler using JsonFormatter
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root_logger.addHandler(handler)

    # Keep third-party loggers sane but structured
    for logger_name in ("uvicorn", "uvicorn.access", "uvicorn.error", "fastapi", "apscheduler"):
        tgt = logging.getLogger(logger_name)
        tgt.handlers = []
        tgt.propagate = True
