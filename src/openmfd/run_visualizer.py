import http.server
import socketserver
import webbrowser
import os
import sys
import threading
import json
import importlib.util
from pathlib import Path

PORT = 8000

CWD = Path.cwd()


def get_openmfd_env_dir():
    """Return the absolute path to the openmfd package directory."""
    spec = importlib.util.find_spec("openmfd")
    if spec and spec.origin:
        package_path = Path(spec.origin).parent
        # print(f"\tFound openmfd package at: {package_path.relative_to(CWD)}")
        return package_path.relative_to(CWD)
    print("\topenmfd package not found in sys.path")
    return None


class OpenMFDHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.env_dir = get_openmfd_env_dir()
        self.visualizer_dir = self.env_dir / "visualizer"
        self.docs_dir = self.env_dir / "docs"
        if not self.visualizer_dir:
            raise RuntimeError("Cannot find visualizer directory!")
        super().__init__(*args, directory=CWD, **kwargs)

    def do_GET(self):
        if "?" in self.path:
            self.path = self.path.split("?", 1)[0]

        if self.path == "/":
            # Serve visualizer index
            self.path = str(self.visualizer_dir / "index.html")
            super().do_GET()
        elif self.path == "/favicon.ico":
            # Serve visualizer favicon
            self.path = str(self.env_dir / "favicon.ico")
            super().do_GET()
        elif self.path == "/main.js":
            # Serve visualizer main.js
            self.path = str(self.visualizer_dir / "main.js")
            super().do_GET()
        elif self.path.startswith("/visualizer/three"):
            self.path = str(self.env_dir / self.path.lstrip("/"))
            super().do_GET()
        elif self.path == "/glb_list.json":
            preview_dir = self.get_glb_dir()
            if not preview_dir:
                self.send_response(404)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(
                    json.dumps({"error": "No valid .glb directory found."}).encode(
                        "utf-8"
                    )
                )
                return
            glb_files = self.list_glb_files(preview_dir)
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(glb_files).encode("utf-8"))
        elif self.path.endswith(".glb"):
            self.path = self.path.lstrip("/")
            super().do_GET()
        else:
            self.send_error(404, "File not found")

    def do_HEAD(self):
        if self.path.endswith(".glb"):
            self.path = self.path.lstrip("/")
        else:
            self.send_error(404, "File not found")
        return super().do_HEAD()

    def get_glb_dir(self):
        """Determine which .glb directory to use."""
        # 1. Use CWD preview folder
        cwd_preview = Path("preview")
        if cwd_preview.is_dir():
            print(f"Using preview directory from CWD: {cwd_preview}")
            return cwd_preview

        # 2. Use default visualizer/device folder
        default_dir = self.visualizer_dir / "demo_device"
        if default_dir.is_dir():
            print(f"Using default preview directory: {default_dir}")
            return default_dir

        return None

    def list_glb_files(self, preview_dir):
        """Return a list of .glb files for JSON."""
        glb_list = []

        for path in preview_dir.iterdir():
            if path.is_file() and path.suffix.lower() == ".glb":
                name = path.stem
                type_str = "unknown"

                # Determine type and clean name
                if name.startswith("bulk_"):
                    name = name[5:].capitalize()
                    type_str = "bulk"

                elif name.startswith("void_"):
                    name = name[5:].capitalize()
                    type_str = "void"

                elif name.startswith("regional_"):
                    name = name[9:]
                    if name.startswith("membrane_settings_"):
                        name = name[18:].capitalize()
                        type_str = "regional membrane settings"
                    elif name.startswith("position_settings_"):
                        name = name[18:].capitalize()
                        type_str = "regional position settings"
                    elif name.startswith("exposure_settings_"):
                        name = name[18:].capitalize()
                        type_str = "regional exposure settings"
                    elif name.startswith("secondary_dose_settings_"):
                        name = name[24:].capitalize()
                        type_str = "regional secondary dose"
                    else:
                        name = name.capitalize()
                        type_str = "regional"

                elif name == "ports":
                    name = "Unconnected Ports"
                    type_str = "ports"

                elif name == "device":
                    name = "Device"
                    type_str = "device"

                elif name == "bounding_box":
                    name = "Bounding Box"
                    type_str = "bounding box"

                glb_list.append(
                    {
                        "name": name,
                        "type": type_str,
                        "file": path.as_posix(),  # JSON-friendly
                    }
                )

        return glb_list


def start_server():
    handler = lambda *args, **kwargs: OpenMFDHandler(*args, **kwargs)
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        httpd.serve_forever()


def open_browser():
    # webbrowser.open(f"http://localhost:{PORT}")
    pass


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Run OpenMFD Visualizer server.")
    args = parser.parse_args()
    threading.Thread(target=start_server, daemon=True).start()
    print("Server starting...")
    import time

    time.sleep(1)  # Ensure server thread has started
    open_browser()
    input("Press Enter to stop the server...\n")


if __name__ == "__main__":
    main()
