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
