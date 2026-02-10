from openmfd import (
    StitchedDevice,
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

# Printer with XY stage required for stitched devices
settings = Settings(
    printer=Printer(
        name="HR3v3",
        light_engines=[
            LightEngine(px_size=0.0076, px_count=(2560, 1600), wavelengths=[365])
        ],
        xy_stage_available=True,
    ),
    resin=ResinType(bulk_exposure=300.0),
    default_position_settings=PositionSettings(),
    default_exposure_settings=ExposureSettings(),
)

# 2x2 stitched device (overall resolution = 5120 x 3200)
device = StitchedDevice(
    name="StitchedDemo",
    position=(0, 0, 0),
    layers=50,
    layer_size=0.01,
    tiles_x=2,
    tiles_y=2,
    base_px_count=(2560, 1600),
    overlap_px=4,
    px_size=0.0076,
)

# Labels
device.add_label("bulk", Color.from_name("gray", 127))
device.add_label("void", Color.from_name("aqua", 127))

# Simple void channel
width, height = device._size[0], device._size[1]
channel1 = Cube((width, 40, 10)).translate((0, 200, 20))
channel2 = Cube((width, 40, 10)).translate((0, height - 200, 20))
channel3 = Cube((40, height, 10)).translate((200, 0, 20))
channel4 = Cube((40, height, 10)).translate((width - 200, 0, 20))
device.add_void("channel1", channel1, label="void")
device.add_void("channel2", channel2, label="void")
device.add_void("channel3", channel3, label="void")
device.add_void("channel4", channel4, label="void")

# Bulk block (add last)
bulk = Cube(device._size, center=False)
bulk.translate(device._position)
device.add_bulk("bulk_shape", bulk, label="bulk")

device.preview()

# Slice
slicer = Slicer(
    device=device,
    settings=settings,
    filename="stitched_demo",
    minimize_file=True,
    zip_output=False,
)

slicer.make_print_file()
