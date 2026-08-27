import logging
import sys
from backend.config import settings

class PIIFilter(logging.Filter):
    """
    Log filter that redacts sensitive keywords and secrets if present in log messages.
    """
    def filter(self, record):
        if isinstance(record.msg, str):
            # Redact common secrets if accidentally logged
            for secret_key in [settings.RAZORPAY_KEY_SECRET, settings.RAZORPAY_WEBHOOK_SECRET]:
                if secret_key and len(secret_key) > 5 and secret_key in record.msg:
                    record.msg = record.msg.replace(secret_key, "[REDACTED_SECRET]")
        return True

def setup_logger(name: str = "revenueguard"):
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
    
    if not logger.handlers:
        import io
        stream = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace') if hasattr(sys.stdout, 'buffer') else sys.stdout
        handler = logging.StreamHandler(stream)
        formatter = logging.Formatter(
            '[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        handler.setFormatter(formatter)
        handler.addFilter(PIIFilter())
        logger.addHandler(handler)
        
    return logger

logger = setup_logger()
