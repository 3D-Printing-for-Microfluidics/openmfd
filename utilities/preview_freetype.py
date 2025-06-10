import freetype
import matplotlib.pyplot as plt
import numpy as np

def glyph_to_polygons(face, char, scale=1.0):
    face.load_char(char, freetype.FT_LOAD_NO_BITMAP)
    outline = face.glyph.outline
    points = np.array(outline.points, dtype=np.float32) * scale
    contours = outline.contours

    polys = []
    start = 0
    for end in contours:
        contour = points[start:end + 1]
        if len(contour) >= 3:
            polys.append(contour)
        start = end + 1
    return polys

def plot_glyph(char, font_path="Arial.ttf", scale=1.0 / 64.0):
    face = freetype.Face(font_path)
    face.set_char_size(64 * 100)  # font size in 1/64 pt

    loops = glyph_to_polygons(face, char, scale=scale)

    fig, ax = plt.subplots()
    for loop in loops:
        loop = np.array(loop)
        x, y = loop[:, 0], loop[:, 1]
        # Close the loop
        x = np.append(x, x[0])
        y = np.append(y, y[0])
        ax.plot(x, y, linewidth=2)

    ax.set_aspect("equal")
    ax.set_title(f"Glyph outline for '{char}'")
    ax.invert_yaxis()  # match FreeType’s Y-up coordinate system
    plt.show()

# Example usage
plot_glyph("l", font_path="pymfd/backend/fonts/arial.ttf")
