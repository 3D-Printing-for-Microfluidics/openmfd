from __future__ import annotations

from pathlib import Path
import re

import cv2
import numpy as np
from PIL import Image

from .uniqueimagestore import get_unique_path
from .slicer import _pack_binary_image, _unpack_image_from_meta


def _update_meta_image(meta: dict, image: np.ndarray) -> None:
    """Update slice metadata with packed image data and width."""
    packed_image, width = _pack_binary_image(image)
    meta["image_data"] = packed_image
    meta["image_width"] = width


def _load_image_from_meta_or_path(
    meta: dict,
    image_path: Path,
    loader,
) -> np.ndarray | None:
    """Load image from metadata if present, otherwise from disk via loader."""
    if meta.get("image_data") is None and not image_path.exists():
        return None
    if meta.get("image_data") is not None:
        return _unpack_image_from_meta(meta)
    try:
        return loader(image_path)
    except Exception:
        return None

def generate_position_images_from_folders(
    image_dir: Path,
    mask_dir: Path,
    settings: "PositionSettings",
    slice_metadata: list[dict],
):
    """Generate position images from existing image and mask folders."""
    slices = slice_metadata["slices"]
    # Loop through all slices
    for i, meta in enumerate(slices):
        # Get image and mask
        name = meta["image_name"]
        mask_path = mask_dir / name
        if not mask_path.exists():
            continue

        mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)
        if mask is None or cv2.countNonZero(mask) == 0:
            continue

        # Check if any image or empty
        if cv2.countNonZero(mask) != 0:
            slices[i]["position_settings"] = settings

def generate_exposure_images_from_folders(
    image_dir: Path,
    mask_dir: Path,
    settings: "ExposureSettings",
    slice_metadata: dict,
):
    """Generate exposure images from existing image and mask folders."""
    slices = slice_metadata["slices"]
    for _, meta in enumerate(slices):
        name = meta["image_name"]
        image_path = image_dir / name
        mask_path = mask_dir / name
        if not mask_path.exists():
            continue

        try:
            mask = np.array(Image.open(mask_path))
        except Exception:
            continue
        if np.count_nonzero(mask) == 0:
            continue

        image = _load_image_from_meta_or_path(
            meta, image_path, lambda path: np.array(Image.open(path))
        )
        if image is None:
            continue

        if np.count_nonzero(image) != 0:
            exposure_image = np.bitwise_and(image, mask)
            image = np.bitwise_and(image, np.bitwise_not(mask))

            stem = Path(name).stem
            Image.fromarray(image).save(image_path)
            _update_meta_image(meta, image)
            if np.count_nonzero(exposure_image) != 0:
                exposure_path = get_unique_path(image_dir, stem, postfix="regional")
                if "exposure_slices" not in slice_metadata:
                    slice_metadata["exposure_slices"] = []
                packed_image, width = _pack_binary_image(exposure_image)
                slice_metadata["exposure_slices"].append(
                    {
                        "image_name": exposure_path.name,
                        "image_data": packed_image,
                        "image_width": width,
                        "layer_position": meta["layer_position"],
                        "exposure_settings": settings,
                        "position_settings": meta["position_settings"],
                    }
                )
                Image.fromarray(exposure_image).save(exposure_path)


def generate_membrane_images_from_folders(
    image_dir: Path,
    mask_dir: Path,
    membrane_settings: "MembraneSettings",
    slice_metadata: dict,
):
    """Generate membrane images from existing image and mask folders."""
    slices = slice_metadata["slices"]

    membrane_thickness_um = membrane_settings.max_membrane_thickness_um
    dilation_px = membrane_settings.dilation_px

    dilation_kernel_size = 2 * dilation_px + 1
    dilation_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT, (dilation_kernel_size, dilation_kernel_size)
    )

    opening_kernel_size = 3
    opening_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT, (opening_kernel_size, opening_kernel_size)
    )

    # loop through all slices
    for i in range(len(slices)):
        # Skip the first slice (membrane needs to be sandwiched by black pixels)
        if i == 0:
            continue

        # Skip the last slice (position only) and the second to last slice (membrane needs to be sandwiched by black pixels)
        if i > len(slices) - 1:
            continue

        # Figure out how many slices are in membrane thickness
        prev_image_index = 0
        delta_z = 0
        for prev_image_index in range(len(slices[:i])):
            delta_z = abs(
                slices[i]["layer_position"] - slices[prev_image_index]["layer_position"]
            )
            if abs(delta_z - membrane_thickness_um) < 0.01:  # 0.01 um tolerance
                break
        if abs(delta_z - membrane_thickness_um) > 0.01:  # 0.01 um tolerance
            continue

        # make images
        next_image_index = i + 1
        for j in range(prev_image_index + 1, next_image_index):
            # get current/mask image
            curr_name = slices[j]["image_name"]
            curr_path = image_dir / curr_name
            curr_mask_path = mask_dir / curr_name
            if not curr_mask_path.exists():
                continue
            mask = cv2.imread(str(curr_mask_path.resolve()), 0)
            if mask is None or cv2.countNonZero(mask) == 0:
                continue  # Skip if mask is completely black
            if slices[j].get("image_data") is None and not curr_path.exists():
                image = cv2.imread(str(curr_path.resolve()), 0)
                if image is None:
                    continue
            elif slices[j].get("image_data") is not None:
                image = _unpack_image_from_meta(slices[j])
            else:
                continue

            # Get previous image
            prev_name = slices[prev_image_index]["image_name"]
            prev_path = image_dir / prev_name
            if (
                slices[prev_image_index].get("image_data") is None
                and not prev_path.exists()
            ):
                continue
            elif slices[prev_image_index].get("image_data") is not None:
                prev_image = _unpack_image_from_meta(slices[prev_image_index])
            else:
                prev_image = cv2.imread(str(prev_path.resolve()), 0)
            if prev_image is None:
                continue

            if next_image_index >= len(slices):
                next_image = np.zeros_like(image, dtype=np.uint8)
            else:
                next_name = slices[next_image_index]["image_name"]
                next_path = image_dir / next_name
                if (
                    slices[next_image_index].get("image_data") is None
                    and not next_path.exists()
                ):
                    continue
                elif slices[next_image_index].get("image_data") is not None:
                    next_image = _unpack_image_from_meta(slices[next_image_index])
                else:
                    next_image = cv2.imread(str(next_path.resolve()), 0)
                if next_image is None:
                    continue

            mask = cv2.bitwise_and(
                cv2.bitwise_not(prev_image),
                cv2.bitwise_not(mask),
            )
            mask = cv2.bitwise_and(
                cv2.bitwise_not(next_image),
                cv2.bitwise_not(mask),
            )

            masked_membrane = cv2.bitwise_and(image, mask)
            masked_membrane = cv2.morphologyEx(
                masked_membrane, cv2.MORPH_OPEN, opening_kernel
            )

            if cv2.countNonZero(masked_membrane) == 0:
                continue

            image_minus_membrane = image - masked_membrane
            dilated_membrane = cv2.dilate(masked_membrane, dilation_kernel)

            # Overwrite original image
            cv2.imwrite(str(curr_path.resolve()), image_minus_membrane)
            _update_meta_image(slices[j], image_minus_membrane)

            # Write dilated membrane
            stem = Path(curr_name).stem
            membrane_output_path = get_unique_path(image_dir, stem, postfix="membrane")
            if "membrane_slices" not in slice_metadata:
                slice_metadata["membrane_slices"] = []
            packed_image, width = _pack_binary_image(dilated_membrane)
            slice_metadata["membrane_slices"].append(
                {
                    "image_name": membrane_output_path.name,
                    "image_data": packed_image,
                    "image_width": width,
                    "layer_position": slices[j]["layer_position"],
                    "exposure_settings": membrane_settings.exposure_settings,
                    "dilation_px": dilation_px,
                    "position_settings": slices[j]["position_settings"],
                }
            )
            print(f"\t\tSaving membrane image to {membrane_output_path.name}")
            cv2.imwrite(str(membrane_output_path), dilated_membrane)

def generate_secondary_images_from_folders(
    image_dir: Path,
    mask_dir: Path,
    settings: "SecondaryDoseSettings",
    slice_metadata: dict,
):
    """Generate secondary images from existing image and mask folders."""
    # Primary (trivial) case
    # 1. Edge == Roof == Bulk -> D

    # Secondary does cases
    # 1. Roof == Bulk
    #   a. Edge < Bulk -> D, E
    #   b. Edge > Bulk -> D, D-E
    # 2. Edge == Bulk
    #   a. Roof < Bulk -> D, R
    #   b. Roof > Bulk -> D, D-R
    # 3. Edge == Roof
    #   a. Edge < Bulk -> D, E&R
    #   b. Edge > Bulk -> D, D-(E&R)

    # Tertiary dose cases
    # 1. Bulk > Edge > Roof -> D, R, E&R
    # 2. Bulk > Roof > Edge -> D, E, E&R
    # 3. Edge > Bulk > Roof -> D, R, (D-E)&R
    # 4. Roof > Bulk > Edge -> D, E, (D-R)&E
    # 5. Edge > Roof > Bulk -> D, D-(E&R), (D-E)&R
    # 6. Roof > Edge > Bulk -> D, D-(E&R), (D-R)&E

    # i[0] = image
    # i[-1] = previous image
    # D = Dilated
    # E = Eroded
    # R = Roof -> D - (i[0] - (i[-1] & i[-2] & ...))

    # Extract settings
    edge_dose = settings.edge_exposure_settings.exposure_time
    erosion_px = settings.edge_erosion_px
    dilation_px = settings.edge_dilation_px

    roof_dose = settings.roof_exposure_settings.exposure_time
    roof_erosion_px = settings.roof_erosion_px
    layers_above = settings.roof_layers_above

    # Create kernels for morphological operations
    erosion_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT, (2 * erosion_px + 1, 2 * erosion_px + 1)
    )
    dilation_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT, (2 * dilation_px + 1, 2 * dilation_px + 1)
    )
    roof_erosion_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT, (2 * roof_erosion_px + 1, 2 * roof_erosion_px + 1)
    )

    # Loop through all slices
    slices = slice_metadata["slices"]
    prev_images = []
    for _, meta in enumerate(slices):
        # Get image and mask
        name = meta["image_name"]
        image_path = image_dir / name
        mask_path = mask_dir / name
        if not mask_path.exists():
            continue
        mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)
        if mask is None or cv2.countNonZero(mask) == 0:
            continue

        image = _load_image_from_meta_or_path(
            meta, image_path, lambda path: cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
        )
        if image is None:
            continue

        # Add membrane images back before doing morphological operations
        membrane_images = [
            info
            for info in slice_metadata.get("membrane_slices", [])
            if re.search(
                rf"^{re.escape(Path(name).stem)}_membrane.*\.png$", info["image_name"]
            )
        ]
        membranes = np.zeros_like(image, dtype=np.uint8)
        if len(membrane_images) > 0:
            for membrane_image in membrane_images:
                path = image_dir / membrane_image["image_name"]
                membrane_dilation_px = membrane_image["dilation_px"]
                membrane_dilation_kernel_size = 2 * membrane_dilation_px + 1
                membrane_dilation_kernel = cv2.getStructuringElement(
                    cv2.MORPH_RECT,
                    (membrane_dilation_kernel_size, membrane_dilation_kernel_size),
                )
                membrane = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
                if membrane is not None:
                    og_membrane = cv2.erode(membrane, membrane_dilation_kernel)
                    membranes = cv2.bitwise_or(membranes, og_membrane)

        # Preform morphological operations
        eroded = cv2.erode(cv2.bitwise_or(image, membranes), erosion_kernel)
        dilated = cv2.dilate(cv2.bitwise_or(image, membranes), dilation_kernel)
        eroded = cv2.bitwise_and(eroded, cv2.bitwise_not(membranes))
        dilated = cv2.bitwise_and(dilated, cv2.bitwise_not(membranes))

        # Make edge image
        edge_image = cv2.bitwise_and(dilated, cv2.bitwise_not(eroded))

        # Make roof image
        roof_image = None
        if layers_above > 0:
            roof_image = np.full_like(image, 255, dtype=np.uint8)
            for prev_image in prev_images:
                eroded_prev = cv2.erode(prev_image, roof_erosion_kernel)
                roof_image = cv2.bitwise_and(roof_image, eroded_prev)

            roof_eroded = cv2.erode(image, roof_erosion_kernel)
            roof_image = (
                cv2.bitwise_and(
                    roof_eroded, cv2.bitwise_not(cv2.bitwise_or(roof_image, membranes))
                )
                if membranes is not None
                else cv2.bitwise_and(roof_eroded, cv2.bitwise_not(roof_image))
            )

        if len(prev_images) >= layers_above and layers_above > 0:
            prev_images.pop(0)
        if layers_above > 0:
            prev_images.append(image.copy())

        # Make bulk image
        bulk_image = cv2.bitwise_and(
            image,
            cv2.bitwise_not(
                cv2.bitwise_or(
                    edge_image,
                    roof_image if roof_image is not None else np.zeros_like(image),
                )
            ),
        )

        if roof_dose is None and edge_dose is None:
            continue
        elif edge_dose is None:
            edge_image = None
        elif roof_dose is None:
            roof_image = None
        elif edge_dose >= roof_dose:
            edge_image = cv2.bitwise_and(edge_image, cv2.bitwise_not(roof_image))
        else:
            roof_image = cv2.bitwise_and(roof_image, cv2.bitwise_not(edge_image))

        # Calculate masked bulk
        outside = cv2.bitwise_and(image, image, mask=cv2.bitwise_not(mask))
        inside = cv2.bitwise_and(bulk_image, bulk_image, mask=mask)
        bulk_image = cv2.add(outside, inside)

        # Calculate masked edge and roof
        if edge_image is not None:
            edge_image = cv2.bitwise_and(edge_image, mask)
        if roof_image is not None:
            roof_image = cv2.bitwise_and(roof_image, mask)

        # Check if any image is None or empty
        if cv2.countNonZero(bulk_image) == 0:
            bulk_image = None
        if edge_image is not None and cv2.countNonZero(edge_image) == 0:
            edge_image = None
        if roof_image is not None and cv2.countNonZero(roof_image) == 0:
            roof_image = None

        # Save images
        if "secondary_slices" not in slice_metadata:
            slice_metadata["secondary_slices"] = []
        stem = Path(name).stem
        if bulk_image is not None and cv2.bitwise_xor(bulk_image, image).any():
            _update_meta_image(meta, bulk_image)
            cv2.imwrite(str(image_path), bulk_image)
        if edge_image is not None:
            edge_path = get_unique_path(image_dir, stem, postfix="edge")
            packed_image, width = _pack_binary_image(edge_image)
            slice_metadata["secondary_slices"].append(
                {
                    "image_name": edge_path.name,
                    "image_data": packed_image,
                    "image_width": width,
                    "layer_position": meta["layer_position"],
                    "exposure_settings": settings.edge_exposure_settings,
                    "position_settings": meta["position_settings"],
                }
            )
            cv2.imwrite(str(edge_path), edge_image)
        if roof_image is not None:
            roof_path = get_unique_path(image_dir, stem, postfix="roof")
            packed_image, width = _pack_binary_image(roof_image)
            slice_metadata["secondary_slices"].append(
                {
                    "image_name": roof_path.name,
                    "image_data": packed_image,
                    "image_width": width,
                    "layer_position": meta["layer_position"],
                    "exposure_settings": settings.roof_exposure_settings,
                    "position_settings": meta["position_settings"],
                }
            )
            cv2.imwrite(str(roof_path), roof_image)
