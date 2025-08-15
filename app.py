from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse
from pathlib import Path
import json

from db import init_db, fetch_foods, insert_food

TEMPLATE_DIR = Path(__file__).parent / "templates"
STATIC_DIR = Path(__file__).parent / "static"

class AppHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path in ("/", "/index.html"):
            self._set_headers(200, "text/html; charset=utf-8")
            with open(TEMPLATE_DIR / "index.html", "rb") as f:
                self.wfile.write(f.read())
        elif parsed.path == "/foods":
            foods = fetch_foods()
            self._set_headers()
            self.wfile.write(json.dumps(foods).encode())
        elif parsed.path.startswith("/static/"):
            file_path = STATIC_DIR / parsed.path[len("/static/"):]
            if file_path.exists():
                content_type = (
                    "application/javascript" if file_path.suffix == ".js" else "text/plain"
                )
                self._set_headers(200, f"{content_type}; charset=utf-8")
                with open(file_path, "rb") as f:
                    self.wfile.write(f.read())
            else:
                self.send_error(404, "Not Found")
        else:
            self.send_error(404, "Not Found")

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/foods":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body.decode())
            except json.JSONDecodeError:
                self.send_error(400, "Invalid JSON")
                return
            name = data.get("name")
            ingredients = data.get("ingredients")
            if not name or not ingredients:
                self.send_error(400, "Missing name or ingredients")
                return
            insert_food(name, ingredients)
            self._set_headers(201)
            self.wfile.write(json.dumps({"status": "created"}).encode())
        else:
            self.send_error(404, "Not Found")

def create_app(port: int = 8000) -> HTTPServer:
    init_db()
    return HTTPServer(("0.0.0.0", port), AppHandler)

def main():
    server = create_app()
    print("Server running at http://localhost:8000")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == "__main__":
    main()
