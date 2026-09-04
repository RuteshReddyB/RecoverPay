#!/usr/bin/env python
"""
RecoverPay — End-to-End Razorpay Demo Script (P2-1)
====================================================
Demonstrates the complete autonomous recovery pipeline in a single traceable run:

  Webhook Payload
       ↓
  POST /api/webhooks/razorpay
       ↓
  RecoverPay AI Decision Engine (ML + Policy)
       ↓
  Autonomous Execution (Payment Link / Retry / Reminder)
       ↓
  Razorpay Test API → Payment Link URL
       ↓
  Audit Log entry with SHA-256 hash

Usage:
    python scripts/demo_razorpay_e2e.py

Requirements:
    - Backend running on http://localhost:8000 (uvicorn backend.main:app --reload)
    - OR run with --offline flag to call components directly without HTTP
"""
import argparse
import json
import uuid
import datetime
import sys
import os

# Allow running from the repo root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def run_via_http(base_url: str = "http://localhost:8000"):
    """Demo path: POST webhook → check response → print Payment Link URL."""
    import requests

    print("\n" + "=" * 60)
    print("  RecoverPay AI — End-to-End Razorpay Demo")
    print("=" * 60)

    # ── Step 1: Simulate a Razorpay payment.failed webhook ───────────────────
    event_id = f"evt_demo_{uuid.uuid4().hex[:10]}"
    payment_id_rzp = f"pay_demo_{uuid.uuid4().hex[:8]}"

    # card_expired → RecoverPay AI should choose PAYMENT_LINK
    webhook_payload = {
        "event": "payment.failed",
        "event_id": event_id,
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id_rzp,
                    "amount": 499900,           # ₹4,999 (within ₹10k policy cap)
                    "currency": "INR",
                    "method": "card",
                    "customer_id": f"c_demo_{uuid.uuid4().hex[:6]}",
                    "email": "demo.customer@example.com",
                    "contact": "+919876543210",
                    "error_reason": "card_expired",
                    "notes": {"name": "Demo Customer"}
                }
            }
        }
    }

    print(f"\n[1] Sending payment.failed webhook to {base_url}/api/webhooks/razorpay")
    print(f"    Event ID     : {event_id}")
    print(f"    Payment ID   : {payment_id_rzp}")
    print(f"    Amount       : ₹4,999.00")
    print(f"    Failure      : card_expired")

    try:
        resp = requests.post(
            f"{base_url}/api/webhooks/razorpay",
            json=webhook_payload,
            headers={"x-razorpay-signature": "demo_signature"},
            timeout=30
        )
        resp.raise_for_status()
        result = resp.json()
    except requests.exceptions.ConnectionError:
        print(f"\n  ❌ Cannot connect to {base_url}")
        print("     Start the backend first: uvicorn backend.main:app --reload --port 8000")
        print("     Or use --offline mode: python scripts/demo_razorpay_e2e.py --offline")
        sys.exit(1)
    except Exception as e:
        print(f"\n  ❌ Webhook request failed: {e}")
        sys.exit(1)

    print(f"\n[2] Webhook Response:")
    print(f"    Status            : {result.get('status')}")
    print(f"    Internal Pay ID   : {result.get('payment_id')}")
    print(f"    Recommended Action: {result.get('recommended_action')}")
    print(f"    Policy Status     : {result.get('policy_status')}")
    print(f"    Execution Status  : {result.get('execution_status')}")
    print(f"    Expected Recovery : ₹{result.get('expected_recovery_rupees', 0):,.2f}")

    exec_result = result.get("execution_result", {})
    if exec_result:
        print(f"\n[3] Razorpay Execution Result:")
        if "short_url" in exec_result:
            print(f"    ✅ Payment Link Created!")
            print(f"    Payment Link URL : {exec_result.get('short_url')}")
            print(f"    Payment Link ID  : {exec_result.get('payment_link_id')}")
            print(f"    Amount           : ₹{exec_result.get('amount_rupees', 0):,.2f}")
            sandbox = exec_result.get("sandbox_mode")
            if sandbox:
                print(f"    Mode             : Sandbox (set RAZORPAY_KEY_ID=rzp_test_* for live test API)")
        elif "retry_id" in exec_result:
            print(f"    ✅ Retry Initiated!")
            print(f"    Retry ID         : {exec_result.get('retry_id')}")
        elif "channels" in exec_result:
            print(f"    ✅ Reminder Dispatched!")
            print(f"    Channels         : {exec_result.get('channels')}")
        else:
            print(f"    Result: {json.dumps(exec_result, indent=6)}")
    else:
        print(f"\n[3] No execution result (policy_status: {result.get('policy_status')})")

    print(f"\n{'=' * 60}")
    print("  Demo complete. Full audit trail logged to Firebase Firestore.")
    print("  Check the dashboard at http://localhost:5173 for the Security Audit Trail.")
    print("=" * 60 + "\n")


def run_offline():
    """Offline demo path: calls components directly without HTTP server."""
    print("\n" + "=" * 60)
    print("  RecoverPay AI — End-to-End Demo (Offline / Direct)")
    print("=" * 60)

    from backend.services.decision_engine import decision_engine
    from backend.services.razorpay_service import razorpay_service
    from backend.agents.recovery_agent import recovery_agent

    payment_id = f"demo_card_expired_{uuid.uuid4().hex[:6]}"

    print(f"\n[1] Running agent workflow for: {payment_id}")
    print(f"    Simulated failure: card_expired  |  Amount: ₹7,999.00")

    result = recovery_agent.run_recovery_workflow(payment_id)

    print(f"\n[2] Agent Execution Result:")
    print(f"    Recommended Action : {result.recommended_action}")
    print(f"    Policy Status      : {result.policy_status}")
    print(f"    Expected Recovery  : ₹{result.expected_recovery_rupees:,.2f}")
    print(f"    Probability        : {result.probability_pct:.1f}%")
    print(f"    Agent Attempts     : {result.agent_attempts}")

    print(f"\n[3] Reasoning Trace ({len(result.reasoning_trace)} steps):")
    for step in result.reasoning_trace:
        print(f"    Step {step.step_index}: [{step.tool_name}]")
        print(f"           {step.reasoning[:100]}...")

    exec_res = result.execution_result
    if "short_url" in exec_res:
        print(f"\n[4] ✅ Payment Link Created!")
        print(f"    URL: {exec_res.get('short_url')}")
    elif "retry_id" in exec_res:
        print(f"\n[4] ✅ Retry Initiated: {exec_res.get('retry_id')}")
    elif "status" in exec_res:
        print(f"\n[4] Execution: {exec_res.get('status')} — {exec_res.get('reason', '')}")

    print(f"\n{'=' * 60}")
    print("  Demo complete.")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RecoverPay E2E Demo")
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Run in offline mode (direct component calls, no HTTP server needed)"
    )
    parser.add_argument(
        "--url",
        default="http://localhost:8000",
        help="Backend base URL (default: http://localhost:8000)"
    )
    args = parser.parse_args()

    if args.offline:
        run_offline()
    else:
        run_via_http(args.url)
