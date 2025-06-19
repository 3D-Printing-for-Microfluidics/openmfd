import numpy as np
import re
from pathlib import Path
import cv2
import os


def generate_secondary_images(
    image_paths=[],
    slices_folder=Path("slices"),
    edge_enabled=True,
    roof_enabled=True,
    narrow_by_px=0,
    widen_by_px=2,
    membrane_widen_by_px=2,
    roof_widen_by_px=2,
    layers_above=5,
    roof_dose=200,
    edge_dose=200,
    bulk_dose=300,
    layers_to_check=None,
    progress=None,
):
    digit_regex = re.compile(r"(\d+)")
    total_num_images = len(image_paths) - 1
    if progress is not None:
        progress("Generating secondary images", 0, total_num_images)

    dilation_kernel_size = 2 * narrow_by_px + 1
    erosion_kernel_size = 2 * widen_by_px + 1
    roof_erosion_kernel_size = 2 * roof_widen_by_px + 1
    dilation_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT, (dilation_kernel_size, dilation_kernel_size)
    )
    erosion_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT, (erosion_kernel_size, erosion_kernel_size)
    )
    roof_erosion_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT, (roof_erosion_kernel_size, roof_erosion_kernel_size)
    )
    images = []

    for i, image_path in enumerate(image_paths):
        image = cv2.imread(str(image_path.resolve()), 0)
        images.append(image)

        image_num = int(digit_regex.search(image_path.name).group(1))
        if layers_to_check is not None and image_num in layers_to_check:

            membrane_path = Path(
                slices_folder, image_path.stem + "_membrane"
            ).with_suffix(".png")
            if membrane_path.exists():
                membrane_image = cv2.imread(str(membrane_path.resolve()), 0)
                membrane_kernel_size = 2 * membrane_widen_by_px + 1
                membrane_kernel = cv2.getStructuringElement(
                    cv2.MORPH_RECT, (membrane_kernel_size, membrane_kernel_size)
                )
                membrane_image = cv2.erode(membrane_image, membrane_kernel)
                image = cv2.bitwise_or(image, membrane_image)

            erroded_image = cv2.erode(image, erosion_kernel)
            dilated_image = cv2.dilate(image, dilation_kernel)

            if membrane_path.exists():
                erroded_image = cv2.subtract(erroded_image, membrane_image)
                dilated_image = cv2.subtract(dilated_image, membrane_image)

            # Do only primary and secondary images
            if (edge_dose == roof_dose) or not roof_enabled or not edge_enabled:
                sec_dose = edge_dose
                if not edge_enabled:
                    sec_dose = roof_dose

                if sec_dose == bulk_dose:
                    continue
                if sec_dose < bulk_dose:
                    primary_image = dilated_image
                    secodary_image = erroded_image
                else:
                    primary_image = dilated_image
                    secodary_image = cv2.subtract(dilated_image, erroded_image)

                if roof_enabled:
                    j = i
                    while j > 0 and j > i - layers_above:
                        j -= 1
                        roof_erroded_image_j = cv2.erode(images[j], roof_erosion_kernel)
                        if sec_dose < bulk_dose:
                            secodary_image = cv2.bitwise_and(
                                secodary_image, roof_erroded_image_j
                            )
                        else:
                            secodary_image = cv2.bitwise_or(
                                secodary_image, cv2.bitwise_not(roof_erroded_image_j)
                            )

                # remove black images and matching secondary images
                if cv2.countNonZero(secodary_image) == 0:
                    continue
                if primary_image.shape == secodary_image.shape and not (
                    np.bitwise_xor(primary_image, secodary_image).any()
                ):
                    continue
                print(f"\tSaving secondary images: {image_path.stem}.png")
                primary_path = Path(
                    slices_folder, image_path.stem + "_primary"
                ).with_suffix(".png")
                secondary_path = Path(
                    slices_folder, image_path.stem + "_secondary"
                ).with_suffix(".png")
                cv2.imwrite(str(primary_path.resolve()), primary_image)
                cv2.imwrite(str(secondary_path.resolve()), secodary_image)
                os.remove(image_path)

            # Include tertiary image
            else:

                roof_image = dilated_image
                j = i
                while j > 0 and j > i - layers_above:
                    j -= 1
                    roof_erroded_image_j = cv2.erode(images[j], roof_erosion_kernel)
                    roof_image = cv2.bitwise_and(roof_image, roof_erroded_image_j)

                primary_image = dilated_image
                if bulk_dose > roof_dose and edge_dose > roof_dose:
                    secodary_image = roof_image
                else:
                    if bulk_dose > edge_dose:
                        secodary_image = erroded_image
                    else:
                        secodary_image = cv2.subtract(
                            dilated_image, (cv2.bitwise_and(erroded_image, roof_image))
                        )

                if roof_dose > bulk_dose and roof_dose > edge_dose:
                    tertiary_image = cv2.subtract(dilated_image, roof_image)
                else:
                    if bulk_dose > edge_dose:
                        tertiary_image = cv2.bitwise_and(erroded_image, roof_image)
                    else:
                        tertiary_image = cv2.subtract(dilated_image, erroded_image)

                # remove full matching images
                if (
                    primary_image.shape == secodary_image.shape
                    and secodary_image.shape == tertiary_image.shape
                    and not (np.bitwise_xor(primary_image, secodary_image).any())
                    and not (np.bitwise_xor(secodary_image, tertiary_image).any())
                ):
                    continue

                print(f"\tSaving tertiary images: {image_path.stem}.png")
                primary_path = Path(
                    slices_folder, image_path.stem + "_primary"
                ).with_suffix(".png")
                secondary_path = Path(
                    slices_folder, image_path.stem + "_secondary"
                ).with_suffix(".png")
                tertiary_path = Path(
                    slices_folder, image_path.stem + "_tertiary"
                ).with_suffix(".png")
                if cv2.countNonZero(primary_image) != 0:
                    cv2.imwrite(str(primary_path.resolve()), primary_image)
                if cv2.countNonZero(secodary_image) != 0:
                    cv2.imwrite(str(secondary_path.resolve()), secodary_image)
                if cv2.countNonZero(tertiary_image) != 0:
                    cv2.imwrite(str(tertiary_path.resolve()), tertiary_image)
                os.remove(image_path)
        if progress is not None:
            if not progress("Generating secondary images", i, total_num_images):
                return False
    return True


if __name__ == "__main__":
    import sys

    def expand_string_range(x):
        """
        Takes a string of the format '1-5, 8, 12-14' and returns a list
        with all numbers in the range, i.e. [1, 2, 3, 4, 5, 8, 12, 13, 14]
        """
        result = []
        for part in x.split(","):
            if "-" in part:
                a, b = part.split("-")
                a, b = int(a), int(b)
                result.extend(range(a, b + 1))
            else:
                a = int(part)
                result.append(a)
        return result

    generate_secondary_images(
        Path(sys.argv[1]),
        high_edge_dose=True,
        layers_to_check=expand_string_range("99-100"),
    )
