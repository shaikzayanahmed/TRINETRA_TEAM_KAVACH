import urllib.request
import json

def test_ingest():
    # 1. Ingest alert
    alert_payload = {
        "alert_type": "TRIPWIRE_BREACH",
        "severity": "CRITICAL",
        "confidence": 98.7,
        "metadata": {
            "target": "TGT-9042",
            "threat_level": "RED",
            "zone": "Zone Alpha Sector 07"
        }
    }
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/alerts",
        data=json.dumps(alert_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    res = urllib.request.urlopen(req)
    alert_data = json.loads(res.read().decode('utf-8'))
    print("Created Alert:", alert_data["id"], alert_data["alert_type"], alert_data["severity"])

    # 2. Ingest evidence
    evidence_payload = {
        "alert_id": alert_data["id"],
        "plate_number": "KA 04 MB 4821",
        "vehicle_color": "White Silver",
        "vehicle_type": "SUV / Light Utility",
        "confidence": 99.2,
        "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "thumbnail_data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/...",
    }
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/evidence",
        data=json.dumps(evidence_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    res = urllib.request.urlopen(req)
    ev_data = json.loads(res.read().decode('utf-8'))
    print("Created Evidence:", ev_data["id"], ev_data["sha256"])

    # 3. Retrieve all alerts
    res = urllib.request.urlopen("http://127.0.0.1:8000/api/alerts")
    alerts = json.loads(res.read().decode('utf-8'))
    print("Total Alerts in Database:", len(alerts))

    # 4. Retrieve all evidence
    res = urllib.request.urlopen("http://127.0.0.1:8000/api/evidence")
    evidences = json.loads(res.read().decode('utf-8'))
    print("Total Evidence in Database:", len(evidences))

if __name__ == "__main__":
    test_ingest()
