# Render PlantUML (.puml) to PNG via the public plantuml.com server.
# Usage (from repo root): python docs/sv4/03_tools/render_puml.py docs/sv4/02_source/*.puml
# PNG files are written to docs/sv4/01_output/diagrams/ (English) or diagrams_vi/ (sources in 02_source/vi/).
import sys, zlib, urllib.request, pathlib
A = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_"
def enc(data: bytes) -> str:
    c = zlib.compressobj(9, zlib.DEFLATED, -15)
    z = c.compress(data) + c.flush()
    out = []
    for i in range(0, len(z), 3):
        b = z[i:i+3] + b"\0" * (3 - len(z[i:i+3]))
        n = (b[0] << 16) | (b[1] << 8) | b[2]
        out.append(A[(n >> 18) & 63] + A[(n >> 12) & 63] + A[(n >> 6) & 63] + A[n & 63])
    return "".join(out)
for f in sys.argv[1:]:
    p = pathlib.Path(f)
    url = "https://www.plantuml.com/plantuml/png/" + enc(p.read_bytes())
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read(); err = r.headers.get("X-PlantUML-Diagram-Error")
    except urllib.error.HTTPError as e:
        data = e.read(); err = e.headers.get("X-PlantUML-Diagram-Error") or str(e.code)
    folder = "diagrams_vi" if p.resolve().parent.name == "vi" else "diagrams"
    out = pathlib.Path(__file__).resolve().parents[1] / "01_output" / folder / (p.stem + ".png")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(data)
    print(p.name, len(data), "ERROR: " + err if err else "OK")
