from openmfd import (
    Component,
    Port,
    Router,
    BezierCurveShape,
    Color,
    Cube,
)
from openmfd.component_library import Valve20px, TJunction

channel_size = (8, 8, 6)
channel_margin = (8, 8, 6)

component = Component(
    size=(150, 150, 100), position=(0, 0, 0), px_size=0.0076, layer_size=0.01
)
component.add_label("fluidic", Color.from_name("aqua", 127))
component.add_label("pneumatic", Color.from_name("red", 127))
component.add_label("bulk", Color.from_name("gray", 127))

t = (
    TJunction(channel_size=channel_size, channel_margin=channel_margin)
    .rotate(-90)
    .translate([20, 50, 10])
)
valve = Valve20px().translate([50, 50, 25])
component.add_subcomponent("t_junction", t)
component.add_subcomponent("valve", valve)

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

router = Router(component, channel_size=channel_size, channel_margin=channel_margin)
router.autoroute_channel(valve.P_IN, comp_ports["B"], label="pneumatic")
router.autoroute_channel(t.F_IN1, comp_ports["A"], label="fluidic")
router.autoroute_channel(t.F_OUT, valve.F_IN, label="fluidic")

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

bulk_cube = Cube((150, 150, 150))
component.add_bulk("bulk", bulk_cube, label="bulk")

router.route()
component.preview()
