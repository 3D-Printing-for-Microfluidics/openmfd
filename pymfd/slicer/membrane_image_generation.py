import re
from pathlib import Path
import cv2
import numpy as np


def generate_membrane_images(
    image_paths=[],
    slices_folder=Path("slices"),
    membrane_thickness=2,
    widen_by_px=2,
    layers_to_check=None,
    progress=None,
):
    digit_regex = re.compile(r"(\d+)")
    total_num_images = len(image_paths) - 1
    if progress is not None:
        progress("Generating membrane images", 0, total_num_images)

    dilation_kernel_size = 2 * widen_by_px + 1
    dilation_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT, (dilation_kernel_size, dilation_kernel_size)
    )
    opening_kernel_size = 3
    opening_kernal = cv2.getStructuringElement(
        cv2.MORPH_RECT, (opening_kernel_size, opening_kernel_size)
    )
    images = []
    for i, image_path in enumerate(image_paths):
        image = cv2.imread(str(image_path.resolve()), 0)
        images.append(image)

        if i < membrane_thickness + 1:
            continue

        image_num_first = int(
            digit_regex.search(image_paths[i - (membrane_thickness + 1)].name).group(1)
        )
        image_num_last = int(digit_regex.search(image_paths[i].name).group(1))

        if (
            layers_to_check is not None
            and image_num_first in layers_to_check
            and image_num_last in layers_to_check
        ):

            mask = cv2.bitwise_and(
                cv2.bitwise_not(images[i]),
                cv2.bitwise_not(images[i - (membrane_thickness + 1)]),
            )
            for j in range(membrane_thickness):
                index = i - (j + 1)
                masked_membrane = cv2.bitwise_and(images[index], mask)
                masked_membrane = cv2.morphologyEx(
                    masked_membrane, cv2.MORPH_OPEN, opening_kernal
                )
                if cv2.countNonZero(masked_membrane) != 0:
                    image_minus_membrane = images[index] - masked_membrane
                    dilated_membrane = cv2.dilate(masked_membrane, dilation_kernel)

                    new_image_path = Path(
                        slices_folder, image_paths[index].stem + "_membrane"
                    ).with_suffix(".png")
                    print(f"\tSaving membrane image to {new_image_path.stem}.png")
                    cv2.imwrite(str(image_paths[index].resolve()), image_minus_membrane)
                    cv2.imwrite(str(new_image_path.resolve()), dilated_membrane)

        if progress is not None:
            if not progress("Generating membrane images", i, total_num_images):
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

    generate_membrane_images(
        Path(sys.argv[1]), layers_to_check=expand_string_range("0-150")
    )
