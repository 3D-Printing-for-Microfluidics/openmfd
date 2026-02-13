# Shapes and Operations

Prev: [Part 4: Creating Your First Component](4-building_first_component.md)

This step dives into the core building blocks: shapes, transforms, and boolean operations. It also provides a reference-style walkthrough of each shape type.

---

## Step 1 — Shapes (primitives)

OpenMFD provides a compact set of primitives. All sizes are in **pixels (x/y)** and **layers (z)** unless noted.

### `Cube(size)`

A rectangular block aligned to the axes.

```python
cube = openmfd.Cube((20, 10, 6))
```

Use cases: bulk volumes, straight channels, rectangular cutouts.

### `Cylinder(size)`

A cylinder aligned on the Z‑axis. The `size` tuple defines diameter in X/Y and height in Z.

```python
cyl = openmfd.Cylinder((8, 8, 12))
```

Use cases: round vias, circular reservoirs, posts.

### `Sphere(size)`

An ellipsoid. The `size` tuple defines the full extent in X/Y/Z.

```python
sphere = openmfd.Sphere((10, 10, 10))
```

Use cases: rounded terminations, smooth blending volumes.

### `RoundedCube(size, radius=...)`

A cube with rounded edges.

```python
rounded = openmfd.RoundedCube((20, 10, 6), radius=2)
```

Use cases: channels with softer corners and smoother flow.

### `TextExtrusion(text, height, font_size, ...)`

Extrudes 2D text into a 3D shape.

```python
label = openmfd.TextExtrusion("OpenMFD", height=1, font_size=12)
```

Use cases: raised/engraved labels and quick “stamp” features.

### `ImportModel(path, ...)`

Imports external geometry (e.g., GLB/STL) and converts it into a shape.

```python
imported = openmfd.ImportModel("fixtures/marker.glb")
```

Use cases: custom geometry, branding, or complex shapes.

### `TPMS(...)`

Generates triply periodic minimal surface structures.

```python
tpms = openmfd.TPMS(
	size=(20, 20, 20),
	cells=(2, 2, 1),
	func=openmfd.TPMS.gyroid,
	fill=0.0,
	refinement=10,
)
```

Key parameters:

- `size` — unit cell size in px/layer space
- `cells` — number of unit cells in X/Y/Z
- `func` — TPMS function (e.g., `gyroid`, `diamond`, `schwarz_p`)
- `fill` — level set value (isosurface at 0)
- `refinement` — level set resolution

Use cases: lattices, porous regions, and advanced mixing structures.

---

## Step 2 — Shape transforms

Every shape supports the same core transforms. Transforms can be chained.

### `translate((x, y, z))`

Moves a shape by the given offset.

```python
cube = openmfd.Cube((10, 10, 5)).translate((5, 0, 2))
```

### `rotate((rx, ry, rz))`

Rotates a shape in degrees about X, Y, and Z.

```python
cube = openmfd.Cube((10, 10, 5)).rotate((0, 0, 45))
```

### `resize((x, y, z))`

Scales a shape to the target dimensions.

```python
cube = openmfd.Cube((10, 10, 5)).resize((20, 10, 5))
```

### `mirror((x, y, z))`

Mirrors a shape across the requested axes. Use 1 to mirror on an axis and 0 to leave it unchanged.

```python
cube = openmfd.Cube((10, 10, 5)).mirror((1, 0, 0))
```

### `copy()`

Creates a duplicate so you can transform independently.

```python
cube = openmfd.Cube((10, 10, 5))
copy = cube.copy().translate((15, 0, 0))
```

---

## Step 3 — Boolean operations

Boolean operations combine shapes into more complex geometry.

### Union (`a + b`)

```python
shape = openmfd.Cube((10, 10, 5)) + openmfd.Sphere((8, 8, 8))
```

### Difference (`a - b`)

```python
shape = openmfd.Cube((20, 20, 10)) - openmfd.Cylinder((6, 6, 12))
```

### Hull (`a.hull(b)`)

Creates a smooth blend between two shapes.

```python
shape = openmfd.Sphere((6, 6, 6)).hull(openmfd.Sphere((6, 6, 6)).translate((12, 0, 0)))
```

---

## Step 4 — Putting it together

```python
component = openmfd.Component(size=(80, 60, 20), px_size=0.0076, layer_size=0.01)
component.add_label("bulk", openmfd.Color.from_name("aqua", 127))
component.add_label("void", openmfd.Color.from_name("red", 200))

bulk = openmfd.RoundedCube((80, 60, 20), radius=2)
channel = openmfd.Cylinder((6, 6, 24)).translate((40, 30, 10))

component.add_void("channel", channel, label="void")
component.add_bulk("bulk", bulk, label="bulk")
component.preview()
```

---

## Next

Next: [Part 6: Parametric Design](6-parametric_design.md)
