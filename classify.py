import os
import json

docs = [
    "./docs/documentation/TOR-LPN-EBikes- v5.pdf",
    "./docs/documentation/Functional Specification.docx",
    "./docs/superpowers/plans/2026-05-03-ari-bicycle.md",
    "./docs/superpowers/specs/2026-05-03-ari-bicycle-design.md"
]

for doc in docs:
    name = os.path.basename(doc).replace(" ", "_")
    with open(f".planning/intel/classifications/{name}.json", "w") as f:
        json.dump({"path": doc, "type": "DOC"}, f)
