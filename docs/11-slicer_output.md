# Interpreting Slicer Output
Prev: [Part 12: Slicing Process](10-slicing.md)

This step explains what the slicer produces and how to validate it. PyMFCAD outputs everything needed to reproduce the print: the **design metadata**, **settings**, and **image stack**.

---

## What the slicer writes

When you run `slicer.make_print_file()`, you should get:

1. **Output folder** named after your `filename` (or a ZIP if `zip_output=True`).
2. **Slices folder** containing 8-bit grayscale images (one per layer unless minimized).
3. **JSON print file** that follows the PyMFCAD print schema.
4. **Recompile-ready metadata** (all python code needed to regenerate the stack).

**Checkpoint:** You should see a folder containing a JSON file and a `slices/` directory with image files.

---

## Slices folder (8-bit grayscale)

The slicer outputs one image per layer in 8-bit grayscale:

- **Black (0)** = no exposure
- **White (255)** = full exposure
- **Gray values** = partial exposure (dose modulation, not currently used. Use images/exposure times instead)

If your device uses multiple exposures per layer (e.g., secondary dose or membranes), you may see multiple images per layer in the settings JSON’s image list.

**Checkpoint:** Each image is 8-bit grayscale. There may be more or less images than layers in the JSON.

---

## JSON print file (schema-defined)

The JSON file is the single source of truth for the print job. It conforms to the schema published to [our repository](https://github.com/3D-Printing-for-Microfluidics/3D_printer_json_print_file).

If you want a human-readable walkthrough, see the [JSON print file reference](r4-json_print_file_reference.md).

At a high level, it contains:

- **Header**: schema version, image directory, and print flags
- **Design**: user, purpose, resin, printer, slicer metadata
- **Default layer settings**: global position and exposure defaults
- **Layers**: per-layer overrides (if any)

**Checkpoint:** The JSON should include a `Header`, `Design`, and `Default layer settings` section.

---

## Minimization (file size reduction)

If you enabled `minimize_file=True`, the slicer may store reduced images to save space. This does not change the printed geometry, only the representation.

**Checkpoint:** Minimization should reduce the output size without changing the visible geometry when viewed in a slicer or preview tool.

---

## Quick validation checklist

- Confirm the **image directory** in JSON matches your slices folder name.
- Verify that **default exposure/position** settings are present.
- If you set **burn-in**, check that early layers have longer exposure times.

---


Next: [Part 14: Configuring Regional Settings](12-regional_settings.md)