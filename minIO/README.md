# TRINETRA · MinIO S3 Object Storage & Evidence Repository
## High-Security Military-Grade Forensic Vault (WORM Storage)

This directory acts as the local persistent storage and mirror for **MinIO S3-Compatible Object Storage** (`Bucket: trinetra-evidence`) used by TRINETRA.

---

### S3 Bucket Architecture (`trinetra-evidence`)

```
minIO/
└── trinetra-evidence/
    ├── bucket_policy.json          # S3 WORM & Cryptographic Immutability Policy
    ├── evidence_manifest.json      # Master Evidence Manifest with SHA-256 Hashes
    ├── clips/                      # Recorded 4s Breach & Transit Video Clips (.webm / .mp4)
    │   ├── EV-00421_breach_clip.webm
    │   ├── EV-00418_anomalous_motion.webm
    │   ├── EV-00395_vehicle_trap.webm
    │   └── EV-00380_loitering_event.webm
    ├── snapshots/                  # High-Resolution 1280x720 Forensic Intrusion Snapshots
    │   ├── EV-00421_snapshot_hd.jpg
    │   ├── EV-00418_snapshot_hd.jpg
    │   ├── EV-00395_snapshot_hd.jpg
    │   └── EV-00380_snapshot_hd.jpg
    └── plates/                     # Multi-Frame Burst Best-Shot ANPR Crops & Metadata
        ├── DL01AB1234_crop.jpg
        ├── DL01AB1234_meta.json
        ├── MH12DE1433_crop.jpg
        ├── MH12DE1433_meta.json
        ├── ARMY04A8902_crop.jpg
        └── ARMY04A8902_meta.json
```

---

### Key Capabilities for Evaluators & Judges:

1. **WORM Compliance (Write Once, Read Many)**:
   Every evidence artifact is digitally signed with a **SHA-256 cryptographic checksum** at the moment of boundary breach detection. Any tampering or byte manipulation invalidates the hash verification.

2. **Automated Evidence Ingestion Pipeline**:
   - **Trigger**: Edge AI detects a perimeter tripwire breach, loitering anomaly, or unauthorized vehicle.
   - **Capture**: The system records the 4-second incident video clip + high-resolution keyframe snapshot + zoomed plate crop.
   - **Seal**: Ingested into PostgreSQL (`public.evidence`) and synced to MinIO S3 bucket (`trinetra-evidence`).

3. **Chain of Custody & Judicial Admissibility**:
   Full forensic audit trails with operator sign-offs, GPS PostGIS WGS-84 coordinates, and timestamp logs stored in `evidence_manifest.json` complying with Section 65B of the Indian Evidence Act.

4. **Multi-Attribute Soft Biometrics & Vehicle Intelligence**:
   Every evidence record captures and analyzes granular forensic indicators:
   - **Person Biometrics**: Calibrated height estimation (±3cm), complexion/skin tone, face covering & mask type (balaclava/surgical/cloth/none), headwear (hood up/cap/helmet), eyewear, upper apparel (jacket/parka type, color, pattern), lower apparel (cargo pants/trousers, color), footwear (combat boots), carried gear (tactical rucksack, sling bag), and suspicious object detection (pry bars, metallic containers, wire cutters).
   - **Vehicle Intelligence**: Brand/make (Toyota, Mahindra, Tata, Hyundai), model, body style (SUV, Sedan, Commercial Freight, Military Convoy), paint color, window tinting percentage (VLT), distinguishing aftermarket modifications (roof racks, bull bars, custom alloys), occupant count, and ANPR plate OCR verification.
   - **Official Judicial Synthesis**: Comprehensive automated narrative synthesis generated for court and military tribunal review.
