# Routing
Prev: [Part 6: Integrating Subcomponents](6-subcomponents.md)

Routing connects **ports** with channels allowing for easier device design. In OpenMFD, routing provides three levels of control:

- **Automatic paths** when speed matters
- **Guided paths** when you need specific waypoints
- **Fully custom geometry** when you need precise shape control

This section shows when to use each approach and how they differ.

---

## Step 1 — Understand routing methods

OpenMFD supports three approaches:

- **Autoroute:** Automatic pathfinding (A*) that avoids obstacles.
- **Fractional path:** Manual path defined as relative steps that sum to the endpoint.
- **Polychannel route:** Full control using `PolychannelShape`/`BezierCurveShape`.

---

## Step 2 — Add ports and subcomponents

Ports are the connection points between your device and the outside world, or between subcomponents. Here we build a small device and add ports for external connections.

```python
from openmfd import (
    Component,
    Port,
    Color,
    Cube,
)
from openmfd.component_library import Valve20px, TJunction

# Define our channel sizes
channel_size = (8, 8, 6)
channel_margin = (8, 8, 6)

# Create component base
component = Component(
    size=(150, 150, 100), position=(0, 0, 0), px_size=0.0076, layer_size=0.01
)
component.add_label("fluidic", Color.from_name("aqua", 127))
component.add_label("pneumatic", Color.from_name("red", 127))
component.add_label("bulk", Color.from_name("gray", 127))

# Add some subcomponents
t = (
    TJunction(channel_size=channel_size, channel_margin=channel_margin)
    .rotate(-90)
    .translate([20, 50, 10])
)
valve = Valve20px().translate([50, 50, 25])
component.add_subcomponent("t_junction", t)
component.add_subcomponent("valve", valve)

# Add some ports
comp_ports = {
    "A": Port(
        _type=Port.PortType.IN,
        position=(0, 20, 25),
        size=(8, 8, 6),
        surface_normal=Port.SurfaceNormal.NEG_X,
    ),
    "B": Port(
        _type=Port.PortType.INOUT,
        position=(75, 0, 25),
        size=(8, 8, 6),
        surface_normal=Port.SurfaceNormal.NEG_Y,
    ),
    "C": Port(
        _type=Port.PortType.INOUT,
        position=(75, 150, 25),
        size=(8, 8, 6),
        surface_normal=Port.SurfaceNormal.POS_Y,
    ),
    "D": Port(
        _type=Port.PortType.OUT,
        position=(150, 75, 25),
        size=(8, 8, 6),
        surface_normal=Port.SurfaceNormal.POS_X,
    ),
}
for name, port in comp_ports.items():
    component.add_port(name, port)
```

**Checkpoint:** You now have a component with subcomponents and four external ports.

---


## Step 3 — Create the router

With the ports in place, you can now set up routing. The `Router` is initialized with the channel size and a margin, which defines the additional keepout area around each channel to prevent overlaps.

```python
# Create router object
from openmfd import Router
router = Router(component, channel_size=channel_size, channel_margin=channel_margin)
```

---


## Step 4 — Autoroute simple connections

Use autorouting to quickly connect ports with minimal user input. The router will automatically find a path that avoids obstacles.

```python
# Connect t.F_IN1 to component port A (autoroute)
router.autoroute_channel(t.F_IN1, comp_ports["A"], label="fluidic")

# Connect t.F_OUT to valve.F_IN (autoroute)
router.autoroute_channel(t.F_OUT, valve.F_IN, label="fluidic")

# Connect valve.P_IN to component port B (autoroute)
router.autoroute_channel(valve.P_IN, comp_ports["B"], label="pneumatic")
```

---


## Step 5 — Use fractional routing for guided paths

Fractional routing allows you to define a channel path (with a constant cross-section) as a series of relative steps between the start and end ports, giving you fine-grained control over the route.

To use fractional routing, provide a list of relative coordinates (normalized to 1). The steps can follow any path, but the total displacement must sum to 1 in each axis.

```python
# Connect valve.F_OUT to component port C (fractional path)
fractional_route = [
    (0.0, 0.2, 0.0),
    (5.0, 0, 0.0),
    (0.0, 0.2, 0.0),
    (-10, 0.2, 0.0),
    (0.0, 0.2, 0.0),
    (6.0, 0.0, 0.0),
    (0.0, 0.2, 1.0),
]
router.route_with_fractional_path(
    valve.F_OUT, comp_ports["C"], fractional_route, label="fluidic"
)
```

---


## Step 6 — Use polychannel routing for custom geometry

Polychannel routing gives you the most flexibility for complex or non-linear channel paths. Using `PolychannelShape` and `BezierCurveShape` objects, you can fully customize the route, including features like variable cross-sections, non-Manhattan corners, and smooth curves. Like fractional routing, you control the path manually, but with even greater power and options.

```python
from openmfd import BezierCurveShape

# Connect valve.P_OUT to component port D (polychannel with curve)
polychannel_path = [
    BezierCurveShape(
        control_points=[(120, 150, 60), (140, 60, 60)],
        bezier_segments=10,
        position=(125, 75, 25),
        size=channel_size,
        shape_type="rounded_cube",
        rounded_cube_radius=(3, 3, 3),
        absolute_position=True,
    ),
]
router.route_with_polychannel(
    valve.P_OUT, comp_ports["D"], polychannel_path, label="pneumatic"
)
```


## Step 7 — Stub unused ports

If there are any connections in your component or subcomponents that you aren't using, you can mark them as used to hide them from the visualizer. This keeps your design clean and focused only on relevant connections. For example, to stub `t.F_IN2`:

```python
t.connect_port(t.F_IN2.get_name())
```

---


## Step 8 — Run routing and preview

After defining all your routes, run the router to add the channels to your component. You can then preview the result in the visualizer.

```python
# Run the routing process (adds all channels to the component)
router.route()

# Add a bulk shape for visualization
bulk_cube = Cube((150, 150, 150))
component.add_bulk("bulk", bulk_cube, label="bulk")

# Preview the result
component.preview()

```

---


## Full example (reference)

Below is the complete code for reference. This example demonstrates how to combine autoroute, fractional, and polychannel routing, as well as how to stub unused connections.

```python
from openmfd import (
    Component,
    Port,
    Router,
    BezierCurveShape,
    Color,
    Cube,
)
from openmfd.component_library import Valve20px, TJunction

# Define our channel sizes
channel_size = (8, 8, 6)
channel_margin = (8, 8, 6)

# Create component base
component = Component(size=(150, 150, 100), position=(0, 0, 0), px_size=0.0076, layer_size=0.01)
component.add_label("fluidic", Color.from_name("aqua", 127))
component.add_label("pneumatic", Color.from_name("red", 127))
component.add_label("bulk", Color.from_name("gray", 127))

# Add some subcomponents
t = (
    TJunction(channel_size=channel_size, channel_margin=channel_margin)
    .rotate(-90)
    .translate([20, 50, 10])
)
valve = Valve20px().translate([50, 50, 25])
component.add_subcomponent("t_junction", t)
component.add_subcomponent("valve", valve)

# Add some ports
comp_ports = {
    "A": Port(
        _type=Port.PortType.IN,
        position=(0, 20, 25),
        size=(8, 8, 6),
        surface_normal=Port.SurfaceNormal.NEG_X,
    ),
    "B": Port(
        _type=Port.PortType.INOUT,
        position=(75, 0, 25),
        size=(8, 8, 6),
        surface_normal=Port.SurfaceNormal.NEG_Y,
    ),
    "C": Port(
        _type=Port.PortType.INOUT,
        position=(75, 150, 25),
        size=(8, 8, 6),
        surface_normal=Port.SurfaceNormal.POS_Y,
    ),
    "D": Port(
        _type=Port.PortType.OUT,
        position=(150, 75, 25),
        size=(8, 8, 6),
        surface_normal=Port.SurfaceNormal.POS_X,
    ),
}
for name, port in comp_ports.items():
    component.add_port(name, port)

# Create router object
router = Router(component, channel_size=channel_size, channel_margin=channel_margin)

# Autorouting
router.autoroute_channel(valve.P_IN, comp_ports["B"], label="pneumatic")
router.autoroute_channel(t.F_IN1, comp_ports["A"], label="fluidic")
router.autoroute_channel(t.F_OUT, valve.F_IN, label="fluidic")

# Fractional routing
fractional_route = [
    (0.0, 0.2, 0.0),
    (5.0, 0, 0.0),
    (0.0, 0.2, 0.0),
    (-10, 0.2, 0.0),
    (0.0, 0.2, 0.0),
    (6.0, 0.0, 0.0),
    (0.0, 0.2, 1.0),
]
router.route_with_fractional_path(
    valve.F_OUT, comp_ports["C"], fractional_route, label="fluidic"
)

# Polychannel routing
polychannel_path = [
    BezierCurveShape(
        control_points=[(120, 150, 60), (140, 60, 60)],
        bezier_segments=10,
        position=(125, 75, 25),
        size=channel_size,
        shape_type="rounded_cube",
        rounded_cube_radius=(3, 3, 3),
        absolute_position=True,
    ),
]
router.route_with_polychannel(
    valve.P_OUT, comp_ports["D"], polychannel_path, label="pneumatic"
)

# Stub unused connection
t.connect_port(t.F_IN2.get_name())

# Create bulk
bulk_cube = Cube((150, 150, 150))
component.add_bulk("bulk", bulk_cube, label="bulk")

# Route
router.route()

# Preview the result
component.preview()
```


![Routed Example](resources/7.png)

---

**Checkpoint:** You should see a routed device with channels connecting the ports.

---

## Tips

- If autoroute fails, ensure there is enough space for channel + margin, and confirm ports are on the component surface with the correct type and `surface_normal`.
- Use the **Unconnected Ports** visualizer toggle to catch missing routes.
- Polychannel routes are best for non‑Manhattan paths or variable cross‑section channels.

---

Now that you’ve learned the main parts of making a fluidic component, you can move on to creating reusable modules.

Next: [Part 8: Designing Custom Subcomponents](8-making_subcomponent.md)

