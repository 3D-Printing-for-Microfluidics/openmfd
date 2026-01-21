# Integrating Subcomponents
Prev: [Part 5: Working with Polychannels](5-polychannel.md)

Subcomponents are predesigned microfluidic features that you can import and reuse in your own devices. They help you build complex devices more quickly and consistently by leveraging existing designs. Subcomponents can come from the built-in `openmfd.component_library`, other libraries, or your own Python files.

---

## Why use subcomponents?

- **Reuse:** Avoid reinventing common features (e.g., valves, mixers, ports).
- **Consistency:** Standardize features across multiple devices.
- **Productivity:** Build complex devices faster by assembling existing parts.

---

## Step 1 — Transform subcomponents

You can apply basic transforms to subcomponents, such as translation, 90-degree rotations, and mirroring in X/Y. This allows you to position and orient subcomponents as needed within your device.

---

## Step 2 — Add a subcomponent

```python
from openmfd import Component, Color, Cube
from openmfd.component_library import Valve20px

component = Component(
    size=(100, 100, 20), position=(0, 0, 0), px_size=0.0076, layer_size=0.01
)
component.add_label("default", Color.from_rgba((0, 255, 0, 255)))
component.add_label("bulk", Color.from_name("aqua", 127))

subcomponent = Valve20px().translate([33, 33, 0])
component.add_subcomponent("example_subcomponent", subcomponent)

bulk_cube = Cube((100, 100, 20))
component.add_bulk("bulk", bulk_cube, label="bulk")

component.preview()
component.render("my_first_component.glb")
```

![Preview of valve subcomponent](resources/6.png)

**Checkpoint:** In the visualizer, you should see the valve embedded inside the bulk.

---

## Tips

- Subcomponents carry their own labels and ports.
- When you add a subcomponent, its labels are namespaced as `subcomponent_name.label`.
- Use transforms before adding the subcomponent to position it correctly.

---

Now let’s explore routing!

Next: [Part 7: Routing](7-routing.md)