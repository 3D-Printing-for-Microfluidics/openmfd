import json
import importlib.util
from pathlib import Path

from flask import Flask, jsonify, send_from_directory, abort

PORT = 8000
CWD = Path.cwd().resolve()


def get_openmfd_env_dir():
    """Return the absolute path to the openmfd package directory."""
    spec = importlib.util.find_spec("openmfd")
    if spec and spec.origin:
        package_path = Path(spec.origin).parent
        # print(f"\tFound openmfd package at: {package_path.relative_to(CWD)}")
        return package_path.relative_to(CWD)
    print("\topenmfd package not found in sys.path")
    return None

def start_server():
    app = Flask(__name__)

    env_dir = get_openmfd_env_dir()
    visualizer_dir = (env_dir / "visualizer").resolve()

    if not visualizer_dir.is_dir():
        raise RuntimeError("Cannot find visualizer directory!")

    def get_glb_dir():
        cwd_preview = CWD / "preview"
        if cwd_preview.is_dir():
            return cwd_preview

        default_dir = visualizer_dir / "demo_device"
        if default_dir.is_dir():
            return default_dir

        return None

    def list_glb_files(preview_dir):
        glb_list = []
        for path in preview_dir.iterdir():
            if path.is_file() and path.suffix.lower() == ".glb":
                name = path.stem
                type_str = "unknown"

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

                # remove CWD from path for JSON
                path = path.resolve().relative_to(CWD)

                glb_list.append(
                    {"name": name, "type": type_str, "file": path.as_posix()}
                )

        return glb_list

    @app.route("/")
    def index():
        return send_from_directory(str(visualizer_dir), "index.html")

    @app.route("/favicon.ico")
    def favicon():
        return send_from_directory(str(visualizer_dir), "favicon.ico")

    @app.route("/main.js")
    def main_js():
        return send_from_directory(str(visualizer_dir), "main.js")

    @app.route("/visualizer/<path:subpath>")
    def visualizer_assets(subpath):
        return send_from_directory(str(visualizer_dir), subpath)

    @app.route("/glb_list.json")
    def glb_list():
        preview_dir = get_glb_dir()
        if not preview_dir:
            return jsonify({"error": "No valid .glb directory found."}), 404
        return jsonify(list_glb_files(preview_dir))

    @app.route("/<path:filename>")
    def serve_glb(filename):
        if filename.endswith(".glb"):
            return send_from_directory(str(CWD), filename)
        abort(404)

    print(f"Serving at http://127.0.0.1:{PORT}")
    app.run(host="0.0.0.0", port=PORT)


def main():
    start_server()


if __name__ == "__main__":
    main()
