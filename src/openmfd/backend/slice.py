import time
import numpy as np
from pathlib import Path
from PIL import Image, ImageDraw
from shapely.geometry import Polygon

from . import Cube


def _is_clockwise(polygon: np.ndarray) -> bool:
    """
    Return True if the 2D polygon (Nx2) is clockwise.

    Parameters:

    - polygon (np.ndarray): Polygon points as an Nx2 array.

    Returns:

    - bool: True when the polygon is clockwise.
    """
    x = polygon[:, 0]
    y = polygon[:, 1]
    return np.sum((x[1:] - x[:-1]) * (y[1:] + y[:-1])) > 0


def _slice(
    _type: str,
    device: "Device",
    composite_shape: "Shape",
    directory: Path,
    sliced_devices: list["Device"],
    sliced_devices_info: list[dict],
) -> None:
    """
    Slice the device and save slices in the directory.

    Parameters:

    - _type (str): String indicating the type of slice (e.g. "masks").
    - device (Device): Device to be sliced.
    - composite_shape (Shape): Composite shape of the device to be sliced.
    - directory (Path): Directory to save the slices.
    - sliced_devices (list[Device]): List of already sliced devices.
    - sliced_devices_info (list[dict]): List of dictionaries to store slice info.
    """

    # Slice manifold at layer height and resolution.
    from .. import VariableLayerThicknessComponent

    resolution = (int(device.get_size()[0]), int(device.get_size()[1]))

    if isinstance(device, VariableLayerThicknessComponent):
        expanded_layer_sizes = device._expand_layer_sizes()

    # Slice at layer size.
    slice_num = 0
    slice_position = 0
    actual_slice_position = 0.5
    device_height = device.get_size()[2]
    if _type != "":
        _type = " " + _type
    print(f"\tSlicing {type(device).__name__}{_type}...")
    while actual_slice_position < device_height:
        slice_height = device.get_position()[2] + actual_slice_position
        polygons = composite_shape._object.slice(slice_height).to_polygons()
        print(
            f"\r\t\tLayer {slice_num} at z={actual_slice_position:.4f}/{slice_position:.4f}/{slice_height:.4f} ({len(polygons)} polygons)",
            end="",
            flush=True,
        )

        # Translate polygons into device-local pixel space (XY only).
        polygons = [poly - np.array(device.get_position()[:2]) for poly in polygons]

        # Create a blank grayscale image.
        img = Image.new("L", resolution, 0)
        draw = ImageDraw.Draw(img)

        for poly in polygons:
            # Snap to the pixel grid.
            transformed = np.round(poly).astype(int)
            transformed[:, 1] = img.height - transformed[:, 1]
            points = [tuple(p) for p in transformed]

            # Determine fill color based on orientation.
            if _is_clockwise(transformed):
                fill_color = 255  # solid
            else:
                fill_color = 0  # hole

            # Convert polygon and offset inward slightly to avoid edge artifacts.
            p = Polygon(points)
            px_offset = 0.1
            shrunk = p.buffer(-px_offset)
            # Only process if still valid.
            if not shrunk.is_empty and shrunk.geom_type == "Polygon":
                coords = np.array(shrunk.exterior.coords)
                # Floor to fix polygon inclusivity issues.
                transformed = np.floor(coords).astype(int)
                points = [tuple(p) for p in transformed]

            draw.polygon(points, fill=fill_color)

        # Save the slice image.
        img.save(
            f"{directory}/{device.get_fully_qualified_name()}-slice{slice_num:04}.png"
        )

        if isinstance(device, VariableLayerThicknessComponent):
            # If the device has variable layer thickness, use the per-layer values.
            slice_position += expanded_layer_sizes[slice_num]
            if slice_num < len(expanded_layer_sizes) - 1:
                actual_slice_position += (
                    expanded_layer_sizes[slice_num] / device._layer_size / 2
                    + expanded_layer_sizes[slice_num + 1] / device._layer_size / 2
                )
            else:
                # If this is the last slice, just use the layer size.
                actual_slice_position += (
                    expanded_layer_sizes[slice_num] / device._layer_size
                )
        else:
            slice_position += device._layer_size
            actual_slice_position += 1.0

        if len(sliced_devices) > 0:
            device_index = sliced_devices.index(device)

            W, H = img.size
            img = np.array(img)
            packed_width = (W + 7) // 8
            packed_image = np.zeros((H, packed_width), dtype=np.uint8)
            binary = (img != 0).astype(np.uint8)
            packed_image = np.packbits(binary, axis=1)

            sliced_devices_info[device_index]["slices"].append(
                {
                    "image_name": f"{device.get_fully_qualified_name()}-slice{slice_num:04}.png",
                    "image_data": packed_image,
                    "image_width": W,
                    "layer_position": round(slice_position * 1000, 1),
                }
            )

        slice_num += 1

    print()


def slice_component(
    device: "Device",
    temp_directory: Path,
    sliced_devices: list["Device"],
    sliced_devices_info: list[dict],
    _recursed: bool = False,
) -> None:
    """
    Slice the device's components and save them in the temporary directory.

    Parameters:

    - device (Device): Device to be sliced.
    - temp_directory (Path): Path to the temporary directory where slices will be saved.
    - sliced_devices (list[Device]): List to store sliced devices.
    - sliced_devices_info (list[dict]): List of dictionaries to store slice info.
    - _recursed (bool): Whether this call is from a recursive slice.

    Raises:

        - RuntimeError: Attempted to subtract without a bulk shape.
    """
    # Calculate device relative position
    if device._parent is None:
        parent = None
        x_pos = device.get_position()[0]
        y_pos = device.get_position()[1]
        z_pos = device.get_position()[2] * device._layer_size
    else:
        parent = device._parent
        device_pos = device.get_position(
            px_size=parent._px_size, layer_size=parent._layer_size
        )
        parent_pos = parent.get_position(
            px_size=parent._px_size, layer_size=parent._layer_size
        )
        x_pos = device_pos[0] - parent_pos[0]
        y_pos = device_pos[1] - parent_pos[1]
        z_pos = (device_pos[2] - parent_pos[2]) * parent._layer_size

    # Skip slicing when this component instance was already processed.
    if device in sliced_devices:
        device_index = sliced_devices.index(device)
        sliced_devices_info[device_index]["positions"].append(
            (parent, x_pos, y_pos, z_pos)
        )
        return
    else:
        sliced_devices.append(device)
        sliced_devices_info.append(
            {
                "positions": [(parent, x_pos, y_pos, z_pos)],
                "slices": [],
            }
        )

    # Create a subdirectory for this device.
    device_subdirectory = temp_directory / device.get_fully_qualified_name()
    device_subdirectory.mkdir(parents=True)

    # Start by unioning this component's bulk shapes.
    composite_shape = None
    for bulk in device.bulk_shapes.values():
        composite_shape = (
            bulk.copy(_internal=True)
            if composite_shape is None
            else composite_shape + bulk.copy(_internal=True)
        )

    local_shapes = None
    # Accumulate this component's shapes (e.g., voids or cutouts).
    for shape in device.shapes.values():
        local_shapes = (
            shape.copy(_internal=True)
            if local_shapes is None
            else local_shapes + shape.copy(_internal=True)
        )

    # Accumulate subcomponent bounding boxes and recursively process subcomponents.
    for sub in device.subcomponents.values():
        bbox = sub.get_bounding_box(device._px_size, device._layer_size)
        bbox_cube = Cube(
            size=(
                (bbox[3] - bbox[0]) - device._px_size * 0.1,
                (bbox[4] - bbox[1]) - device._px_size * 0.1,
                (bbox[5] - bbox[2]) - device._layer_size * 0.1,
            ),
            center=False,
        ).translate(
            (
                bbox[0] + device._px_size * 0.05,
                bbox[1] + device._px_size * 0.05,
                bbox[2] + device._layer_size * 0.05,
            )
        )

        local_shapes = local_shapes + bbox_cube if local_shapes is not None else bbox_cube

        slice_component(
            sub,
            temp_directory,
            sliced_devices,
            sliced_devices_info,
            _recursed=True,
        )

    # Subtract this component's shapes (e.g., voids or cutouts).
    if composite_shape is None:
        raise RuntimeError("Tried to subtract without bulk")
    composite_shape = (
        composite_shape - local_shapes if local_shapes is not None else composite_shape
    )

    # Slice the device.
    _slice(
        "",
        device,
        composite_shape,
        device_subdirectory,
        sliced_devices,
        sliced_devices_info,
    )

    # Slice the device's masks.
    for key, (mask, settings) in device.regional_settings.items():
        masks_subdirectory = (
            temp_directory / "masks" / device.get_fully_qualified_name() / key
        )
        masks_subdirectory.mkdir(parents=True)
        _slice(
            f"{key} masks",
            device,
            mask,
            masks_subdirectory,
            [],
            [],
        )
