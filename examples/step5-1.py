from openmfd import *

component = Component(
    size=(100, 100, 20), position=(0, 0, 0), px_size=0.0076, layer_size=0.01
)

component.add_label("default", Color.from_rgba((0, 255, 0, 255)))
component.add_label("bulk", Color.from_name("aqua", 127))

shapes = [
    PolychannelShape(
        shape_type="cube",
        position=(0, 0, 0),
        size=(0, 10, 10),
    ),
    PolychannelShape(
        shape_type="rounded_cube",
        position=(30, 0, 0),
        size=(10, 10, 10),
        rounded_cube_radius=(3, 3, 3),
        corner_radius=20,  # Optional: adds a non-manhattan corner at this point
    ),
    PolychannelShape(
        shape_type="sphere",
        position=(0, 50, 0),
        size=(10, 10, 10),
        corner_radius=0,
    ),
]

channel = Polychannel(shapes)
component.add_void("polychannel_void", channel, label="default")

bulk_cube = Cube((100, 100, 20))
component.add_bulk("bulk", bulk_cube, label="bulk")

component.preview()
component.render("my_first_component.glb")
