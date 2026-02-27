# Parametric Design

Prev: [Part 5: Shapes and Operations](5-shapes_operations.md)

Parametric design means building geometry from variables, loops, and conditionals so you can scale, iterate, and reuse designs quickly. Instead of rewriting geometry, you adjust a few parameters (sizes, positions, feature counts, spacing) and let the design update itself. The result is cleaner, more readable code where changes can be made trivial and consistent.

In this step, we focus on parameterized geometry and settings. Reusable components and subcomponents are introduced later.

---

## Step 1 — Define parameters

```python
import pymfcad

px_size = 0.0076
layer_size = 0.01
L = 120  # component length (in px)
W = 120  # component width (in px)
H = 50   # component height (in layers)

well_d_mm = 0.4 # well diameter (in mm)
well_h_mm = 0.25 # well height (in mm)

component = pymfcad.Component(size=(L, W, H), px_size=px_size, layer_size=layer_size)
component.add_label("bulk", pymfcad.Color.from_name("aqua", 127))
component.add_label("void", pymfcad.Color.from_name("red", 200))
```

---

## Step 2 — Use variables to drive geometry

```python
# convert well from mm to pxs/layers
well_d = round(well_d_mm / px_size)
well_h = round(well_h_mm / layer_size)

# get and reuse component size for bulk
bulk = pymfcad.Cube(component.get_size())
well = pymfcad.Cylinder(height=well_h, radius=well_d/2)
well.translate((L / 2, W / 2, H - well_h))

component.add_void("well", well, label="void")
component.add_bulk("bulk", bulk, label="bulk")
```

---

## Step 3 — Parameter sweeps with loops

You can iterate over a list of parameters to generate repeated features. When using loops, give every feature a unique and descriptive name.

```python
x_positions = [20, 40, 60, 80, 100]
for i, x in enumerate(x_positions):
	via = pymfcad.Cylinder(height=well_h, radius=2).translate((x, 10, H / 2))
	component.add_void(name=f"via_{i:02d}", shape=via, label="void")
    # note: you cannot have components with the same name, you must dynamically generate the name.
```

---

## Step 4 — Conditionals for design variants

Conditionals let you toggle optional features without duplicating code.

```python
add_label = True

if add_label:
	label = pymfcad.TextExtrusion("V1", height=1, font_size=10)
	label.translate((5, 100, H - 1))
	component.add_void("version_label", label, label="void")

component.preview()
```

---

## Next

Next: [Part 7: Working with Polychannels](5-polychannel.md)
