import pytest
from decimal import Decimal
from backend.utils.money import (
    rupees_to_paisa,
    paisa_to_rupees,
    format_rupees,
    calculate_expected_recovery_paisa
)

def test_rupees_to_paisa_precision():
    assert rupees_to_paisa(4999.99) == 499999
    assert rupees_to_paisa("4999.99") == 499999
    assert rupees_to_paisa(Decimal("4999.99")) == 499999
    assert rupees_to_paisa(100) == 10000

def test_paisa_to_rupees_conversion():
    assert paisa_to_rupees(499999) == Decimal("4999.99")
    assert paisa_to_rupees(10000) == Decimal("100.00")

def test_format_rupees():
    assert format_rupees(499999) == "₹4,999.99"
    assert format_rupees(1000000) == "₹10,000.00"

def test_calculate_expected_recovery_paisa():
    # ₹4,999.00 * 0.84 = ₹4,199.16 -> 419916 paisa
    amount_paisa = 499900
    prob = 0.84
    expected = calculate_expected_recovery_paisa(amount_paisa, prob)
    assert expected == 419916

def test_invalid_probability():
    with pytest.raises(ValueError):
        calculate_expected_recovery_paisa(1000, 1.5)
