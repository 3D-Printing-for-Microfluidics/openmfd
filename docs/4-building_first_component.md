# Creating Your First Component

Prev: [Part 3: Using the Visualizer](3-visualizer.md)

This quick “hello world” tutorial builds a minimal component and previews it in the visualizer.

---

## Step 1 — Import OpenMFD

```python
import openmfd
```

---

## Step 2 — Create a component

Components are sized in **pixels (x/y)** and **layers (z)**. You also define the physical resolution: `px_size` and `layer_size` in mm.

```python
component = openmfd.Component(
	size=(100, 100, 20),
	position=(0, 0, 0),
	px_size=0.0076,
	layer_size=0.01,
)
```

---

## Step 3 — Add labels

Labels are named color groups used for visualization and organization.

```python
component.add_label("default", openmfd.Color.from_rgba((0, 255, 0, 255)))
component.add_label("bulk", openmfd.Color.from_name("aqua", 127))
```

---

## Step 4 — Add a simple void

```python
hello = openmfd.TextExtrusion("Hello World!", height=1, font_size=15)
hello.translate((5, 5, 19))
component.add_void("hello", hello, label="default")
```

---

## Step 5 — Add bulk

```python
bulk_cube = openmfd.Cube((100, 100, 20))
component.add_bulk("bulk", bulk_cube, label="bulk")
```

---

## Step 6 — Preview

```python
component.preview()
```

You should see a solid block with the “Hello World” void cut out.

![visualizer-difference](resources/4-1.png)

---

## Next

Next: [Part 5: Shapes and Operations](5-shapes_operations.md)

