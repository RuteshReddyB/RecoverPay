from decimal import Decimal, ROUND_HALF_UP
from typing import Union

def rupees_to_paisa(amount_in_rupees: Union[float, int, str, Decimal]) -> int:
    """
    Convert Rupee amount to Integer Paisa with 0% precision error guarantee.
    Example: 4999.99 -> 499999
    """
    if isinstance(amount_in_rupees, (float, int, str)):
        d_amount = Decimal(str(amount_in_rupees))
    else:
        d_amount = amount_in_rupees
    
    paisa = (d_amount * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return int(paisa)

def paisa_to_rupees(amount_in_paisa: int) -> Decimal:
    """
    Convert Integer Paisa to Decimal Rupee with 2 decimal places.
    Example: 499999 -> Decimal('4999.99')
    """
    d_paisa = Decimal(int(amount_in_paisa))
    return (d_paisa / Decimal("100")).quantize(Decimal("0.01"))

def format_rupees(amount_in_paisa: int) -> str:
    """
    Format Integer Paisa as INR string (e.g. ₹4,999.00)
    """
    rupees = paisa_to_rupees(amount_in_paisa)
    return f"₹{rupees:,.2f}"

def calculate_expected_recovery_paisa(amount_paisa: int, probability: float) -> int:
    """
    Calculate Expected Recovery Value = Amount (paisa) * Probability (0.0 to 1.0).
    Returns exact Integer Paisa rounded cleanly.
    """
    if probability < 0.0 or probability > 1.0:
        raise ValueError("Probability must be between 0.0 and 1.0")
    
    d_amount = Decimal(amount_paisa)
    d_prob = Decimal(str(probability))
    expected = (d_amount * d_prob).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return int(expected)
