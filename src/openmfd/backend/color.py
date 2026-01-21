from __future__ import annotations
from typing import Union
from pathlib import Path
import importlib.util

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


def parse_colors_from_text(
    filename: str, prefix: str = ""
) -> dict[str, tuple[int, int, int]]:
    """Parses a color file and returns a dictionary of colors."""
    with open(filename, "r") as f:
        color_dict = {}
        for line in f:
            if line.strip() == "":
                continue
            name, hex_code = line.strip().split(",")
            name = name.lower()
            hex_code = hex_code.lstrip("#")
            r = int(hex_code[0:2], 16)
            g = int(hex_code[2:4], 16)
            b = int(hex_code[4:6], 16)
            color_dict[prefix + name] = (r, g, b)
    return color_dict


# Load color dictionaries
BASE_COLORS = parse_colors_from_text(
    get_openmfd_env_dir() / "backend" / "colors" / "base_colors.csv"
)
TAB_COLORS = parse_colors_from_text(
    get_openmfd_env_dir() / "backend" / "colors" / "tableau_colors.csv", "tab:"
)
OPEN_COLORS = parse_colors_from_text(
    get_openmfd_env_dir() / "backend" / "colors" / "open_colors.csv"
)
X11_COLORS = parse_colors_from_text(
    get_openmfd_env_dir() / "backend" / "colors" / "x11_colors.csv"
)
XKCD_COLORS = parse_colors_from_text(
    get_openmfd_env_dir() / "backend" / "colors" / "xkcd_colors.csv", "xkcd:"
)


class Color:
    """
    Color class.
    """

    def __init__(self, r: int, g: int, b: int, a: int = 255):
        """
        Initialize the color.

        Parameters:
        
        - r (int): The red value.
        - g (int): The green value.
        - b (int): The blue value.
        - a (int): The alpha value.
        """
        self._r = self._clamp(r)
        self._g = self._clamp(g)
        self._b = self._clamp(b)
        self._a = self._clamp(a)

    @classmethod
    def from_name(cls, name: str = "aqua", alpha: int = 255) -> Color:
        """
        Initialize the color from a name.

        Parameters:

        - name (str): The name of the color.
        - alpha (int): The alpha value.
        """
        name = name.lower()
        # check if name is in any of the color dictionaries
        if (
            name not in BASE_COLORS
            and name not in TAB_COLORS
            and name not in OPEN_COLORS
            and name not in X11_COLORS
            and name not in XKCD_COLORS
        ):
            # check if name is in maplotlib color cycle (c0, c1, c2, ...) if so use TAB_COLORS
            if name.startswith("c") and name[1:].isdigit():
                index = int(name[1:])
                tab_color_keys = list(TAB_COLORS.keys())
                name = tab_color_keys[index % len(tab_color_keys)]
            raise ValueError(f"Unknown color name: {name}")
        r, g, b = (
            BASE_COLORS.get(name)
            or TAB_COLORS.get(name)
            or OPEN_COLORS.get(name)
            or X11_COLORS.get(name)
            or XKCD_COLORS.get(name)
        )
        return cls(r, g, b, alpha)

    @classmethod
    def from_rgba(cls, rgba: tuple[int, int, int, int]) -> Color:
        """
        Initialize the color from a tuple of 4 integers.

        Parameters:

        - rgba (tuple[int, int, int, int]): The RGBA values.
        """
        if len(rgba) != 4:
            raise ValueError("RGBA must be a tuple of 4 integers")
        return cls(*rgba)

    def from_rgba_percent(cls, rgba: tuple[float, float, float, float]) -> Color:
        """
        Initialize the color from a tuple of 4 floats (0.0 to 1.0).

        Parameters:

        - rgba (tuple[float, float, float, float]): The RGBA values.
        """
        if len(rgba) != 4:
            raise ValueError("RGBA must be a tuple of 4 floats")
        r = int(rgba[0] * 255)
        g = int(rgba[1] * 255)
        b = int(rgba[2] * 255)
        a = int(rgba[3] * 255)
        return cls(r, g, b, a)

    @classmethod
    def from_hex(cls, hex_code: str, alpha: int = 255) -> Color:
        """
        Initialize the color from a hex code.

        Parameters:

        - hex_code (str): The hex code.
        - alpha (int): The alpha value.
        """
        hex_code = hex_code.strip().lstrip("#")
        if len(hex_code) != 6:
            raise ValueError("Hex code must be 6 characters long")
        r = int(hex_code[0:2], 16)
        g = int(hex_code[2:4], 16)
        b = int(hex_code[4:6], 16)
        return cls(r, g, b, alpha)

    def _change_to_color(self, color: Color) -> None:
        """
        Change the color to another color.

        Parameters:

        - color (Color): The color to change to.
        """
        self._r = color._r
        self._g = color._g
        self._b = color._b
        self._a = color._a

    def _to_rgba(self) -> tuple[int, int, int, int]:
        """
        Convert the color to a tuple of 4 integers.
        """
        return (self._r, self._g, self._b, self._a)

    def _to_float(self) -> tuple[float, float, float, float]:
        """
        Convert the color to a tuple of 4 floats.
        """
        return (self._r / 256, self._g / 256, self._b / 256, self._a / 256)

    def __str__(self) -> str:
        # """
        # Convert the color to a string.
        # """
        return f"rgba({self._r}, {self._g}, {self._b}, {self._a})"

    def __repr__(self) -> str:
        # """
        # Convert the color to a string.
        # """
        return f"Color(r={self._r}, g={self._g}, b={self._b}, a={self._a})"

    @staticmethod
    def _clamp(value: Union[float, int]) -> int:
        """
        Clamp the value between 0 and 255.
        """
        return max(0, min(255, int(value)))
