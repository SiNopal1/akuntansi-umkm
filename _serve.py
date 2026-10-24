import http.server
import socketserver
import os

PORT = 5173
os.chdir(r"d:\02_Project\Academic\04_Akuntansi UMKM")

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # suppress request logs

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at http://localhost:{PORT}", flush=True)
    httpd.serve_forever()
