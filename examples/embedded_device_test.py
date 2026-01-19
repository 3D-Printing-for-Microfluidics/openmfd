from openmfd import (
    Device,
    Settings,
    Printer,
    LightEngine,
    ResinType,
    PositionSettings,
    ExposureSettings,
    Color,
    Cube,
    Slicer,
)

# Printer with XY stage (recommended when using offsets)
settings = Settings(
    printer=Printer(
        name="HR3v3",
        light_engines=[
            LightEngine(
                "visitech", px_size=0.0152, px_count=(2560, 1600), wavelengths=[405]
            ),
            LightEngine(
                "wintech", px_size=0.00075, px_count=(1920, 1080), wavelengths=[365]
            ),
        ],
        xy_stage_available=True,
    ),
    resin=ResinType(),
    default_position_settings=PositionSettings(),
    default_exposure_settings=ExposureSettings(),
)

# Outer device (lower resolution, larger pixel size)
outer = Device(
    name="OuterDevice",
    position=(0, 0, 0),
    layers=120,
    layer_size=0.015,
    px_count=(2560, 1600),
    px_size=0.0152,
)

outer.add_default_exposure_settings(ExposureSettings(wavelength=405))

outer.add_label("bulk_outer", Color.from_name("gray", 127))
outer.add_label("void", Color.from_name("aqua", 127))

# Outer bulk
outer_bulk = Cube(outer._size, center=False).translate(outer._position)
outer.add_bulk("outer_bulk", outer_bulk, label="bulk_outer")

# Inner device (higher resolution, smaller pixel/layer size)
inner = Device(
    name="InnerDevice",
    position=(0, 0, 0),  # translation in inner device pixels/layers
    layers=160,
    layer_size=0.0015,
    px_count=(1920, 1080),
    px_size=0.00075,
)

inner.add_default_exposure_settings(ExposureSettings(wavelength=365))

inner.add_label("bulk_inner", Color.from_name("black", 127))
inner.add_label("void", Color.from_name("aqua", 127))

inner_bulk = Cube(inner._size, center=False).translate(inner._position)
inner.add_bulk("inner_bulk", inner_bulk, label="bulk_inner")

# A simple void in the inner device
channel = Cube((inner._size[0], 40, 10)).translate((0, 100, 20))
inner.add_void("channel", channel, label="void")

# Embed the inner device into the outer device
inner.translate((500, 400, 10))  # translation in outer device pixels/layers
outer.add_subcomponent("inner", inner)

outer.preview()

slicer = Slicer(
    device=outer,
    settings=settings,
    filename="embedded_device_demo",
    minimize_file=True,
    zip_output=False,
)

slicer.make_print_file()
