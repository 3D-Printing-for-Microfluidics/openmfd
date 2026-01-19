# Slicing Process
Prev: [Part 9: Creating Your First Slicable Device](9-slicer_settings.md)

In this step, you will run the slicer to convert your device into a print-ready output bundle. This is the moment where geometry, settings, and device size are combined into layer-by-layer images and metadata.

---

## Step 1 — Create the slicer

The slicer needs three things:

1. The `device` you created in Step 9
2. The `settings` object (printer + resin + defaults)
3. A filename prefix for output

```python
from openmfd import Slicer

slicer = Slicer(
	device=device,
	settings=settings,
	filename="my_first_slicer_output",
	minimize_file=True,
	zip_output=True,
)
```

**Checkpoint:** You now have a `slicer` object configured for your device.

---

## Step 2 — Generate the print file

```python
slicer.make_print_file()
```

This will write the slicing output to a new folder using the filename you chose. The output usually includes:

- A JSON settings file (device + print metadata)
- Layer images (one per slice)

By default the file is zipped. This can directly be uploaded to one of our custom printers. If you need to further modify or view the sliced output you can instead export to a folder.

**Checkpoint:** You should see a new output ZIP (or a folder) in your working directory.

---

## Common slicing options

You can adjust slicer behavior with a few key flags:

- `minimize_file=True` reduces file size by minimizing JSON and images.
- `zip_output=True` produces a compressed archive instead of a directory.
- `filename` controls the output folder name (keep it short and descriptive).

Use defaults for your first run; adjust only after verifying the output in Part 11.

---

## Quick troubleshooting

If slicing fails, check:

- The device size matches the printer’s light engine resolution.
- Bulk shapes exist.
- If you need negative features, the device has at least one void.
- Your `settings` JSON contains a valid printer and resin.

---

## Next

In Part 11, you will inspect the slicer output, understand the JSON schema, and learn how to validate layer images and metadata.

Next: [Part 11: Interpreting Slicer Output](11-slicer_output.md)

