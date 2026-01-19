from openmfd import *

component = Component(
    size=(100, 100, 20), position=(0, 0, 0), px_size=0.0076, layer_size=0.01
)

component.add_label("default", Color.from_rgba((0, 255, 0, 255)))
component.add_label("bulk", Color.from_name("aqua", 127))

cube = Cube((10, 10, 10))
component.add_void("first_cube", cube, label="default")

sphere = Sphere((10, 10, 7)).translate((100, 100, 20))
component.add_void("my_sphere", sphere, label="default")

hello = TextExtrusion("Hello World!", height=1, font_size=15)
hello.translate((0, 0, 19))
component.add_void("hello", hello, label="default")

bulk_cube = Cube((100, 100, 20))
component.add_bulk("bulk", bulk_cube, label="bulk")

component.preview()
component.render("my_first_component.glb")
