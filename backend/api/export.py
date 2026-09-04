import os
import json
import io
import csv
from fastapi import APIRouter, Response
from backend.services.db_service import AuditLogRepository
from backend.evaluation.benchmark import benchmark_evaluator, BENCHMARK_REPORT_PATH

router = APIRouter(prefix="/api/export", tags=["Data Export"])

@router.get("/audit-logs/csv")
def export_audit_logs_csv(limit: int = 100):
    logs = AuditLogRepository.get_logs(limit=limit)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "Audit Log ID", "Event ID", "Timestamp", "Actor", 
        "Action", "Entity Type", "Entity ID", "SHA256 Hash Checksum"
    ])
    
    for log in logs:
        writer.writerow([
            log.id,
            log.event_id,
            log.timestamp,
            log.actor,
            log.action,
            log.entity_type,
            log.entity_id,
            log.hash
        ])
        
    csv_content = output.getvalue()
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=recoverpay_audit_trail.csv"
        }
    )

@router.get("/benchmark/csv")
def export_benchmark_csv():
    if os.path.exists(BENCHMARK_REPORT_PATH):
        with open(BENCHMARK_REPORT_PATH, "r") as f:
            report = json.load(f)
    else:
        report = benchmark_evaluator.run_batch_benchmark(num_events=1000)
    fin = report.get("financial_metrics", {})
    baseline = fin.get("baseline", {})
    ai = fin.get("revenueguard_ai", {})
    uplift = fin.get("financial_uplift", {})
    ops = report.get("operational_metrics", {})
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["Metric Category", "Baseline (Fixed Retry)", "RecoverPay AI", "Uplift Impact / Delta"])
    writer.writerow(["Evaluation Event Count", report.get("summary", {}).get("events_evaluated", 1000), report.get("summary", {}).get("events_evaluated", 1000), "1,000 Payment Failures"])
    writer.writerow(["Total Revenue at Risk (INR)", f"Rs. {fin.get('total_revenue_at_risk_rupees', 0):,.2f}", f"Rs. {fin.get('total_revenue_at_risk_rupees', 0):,.2f}", "Baseline Risk Pool"])
    writer.writerow(["Total Revenue Recovered (INR)", f"Rs. {baseline.get('recovered_rupees', 0):,.2f}", f"Rs. {ai.get('recovered_rupees', 0):,.2f}", f"+Rs. {uplift.get('additional_revenue_recovered_rupees', 0):,.2f}"])
    writer.writerow(["Recovery Rate (%)", f"{baseline.get('recovery_rate_pct', 0):.2f}%", f"{ai.get('recovery_rate_pct', 0):.2f}%", f"+{uplift.get('revenue_uplift_pct', 0):.2f}% Financial Revenue Uplift"])
    writer.writerow(["Doomed Retries Prevented", "0 (All retried)", ops.get("ai_avoided_doomed_retries", 0), f"{ops.get('ai_avoided_doomed_retries', 0)} doomed retries prevented"])
    writer.writerow(["Human Escalations Triggered", "0 (Manual)", ops.get("ai_human_escalations_triggered", 0), f"{ops.get('ai_human_escalations_triggered', 0)} reviewed via merchant safety cap"])
    
    csv_content = output.getvalue()
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=recoverpay_benchmark_report.csv"
        }
    )
