import http.server
import socketserver
import webbrowser
import os
import threading

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def start_server():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        httpd.serve_forever()

def open_browser():
    url = f"http://localhost:{PORT}/pymfd/viewer/index.html"
    webbrowser.open(url)

if __name__ == "__main__":
    threading.Thread(target=start_server, daemon=True).start()
    open_browser()
    input("Press Enter to stop the server...\n")