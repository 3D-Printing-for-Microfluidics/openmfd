# Configuring Regional Settings
Prev: [Part 13: Interpreting Slicer Output](11-slicer_output.md)

Regional settings let you override print behavior **inside specific 3D regions**. This is how you tune exposure or motion only where it matters (e.g., membranes, valve seats, or reinforcement zones).

OpenMFD supports **four** regional settings types:

1. `ExposureSettings` — change exposure parameters in a region
2. `PositionSettings` — change motion parameters in a region
3. `MembraneSettings` — create thin membranes with custom exposure/defocus
4. `SecondaryDoseSettings` — add edge/roof dosing around features

All of them are attached with `add_regional_settings(name, shape, settings, label)`.

---

## How regional settings work

- The **shape** defines the affected region (cube, sphere, etc.).
- The **settings** define the local overrides.
- The **label** is just a color category for visual inspection in the visualizer.

**Checkpoint:** After adding regional settings, enable the **Regional** toggle in the visualizer to see the region overlays.

---

## 1) ExposureSettings region

Use this to locally change exposure multiplier, power, or focus. This is the most common override.

```python
from openmfd import ExposureSettings, Cube

region = Cube((40, 40, 10)).translate((30, 30, 20))
device.add_label("region_exposure", Color.from_name("yellow", 127))

device.add_regional_settings(
	name="high_dose_zone",
	shape=region,
	settings=ExposureSettings(bulk_exposure_multiplier=1.5, power_setting=120),
	label="region_exposure",
)
```

**When to use:** higher dose near valve seats, thick features, or curing reinforcement zones.

---

## 2) PositionSettings region

Use this when a region needs different motion behavior (e.g., longer wait times or slower lift (usually limited by accelerations)) to reduce delamination or suction.

```python
from openmfd import PositionSettings, Cube

region = Cube((60, 20, 8)).translate((20, 10, 12))
device.add_label("region_motion", Color.from_name("orange", 127))

device.add_regional_settings(
	name="slow_lift_zone",
	shape=region,
	settings=PositionSettings(up_speed=5.0, down_speed=5.0),
	label="region_motion",
)
```

**When to use:** delicate membranes, high-aspect-ratio channels, or suction-prone regions.

---

## 3) MembraneSettings region

Membrane settings create a **thin, locally tuned membrane** by controlling max thickness, dilation, and exposure/defocus.

### How membrane masking works

OpenMFD creates membranes by **detecting thin regions inside the mask** and hole-punching them out of the exposure images, then emitting new images for those layers.

- The slicer builds a **mask** for the regional shape.
- Inside that mask, it scans the geometry and finds any regions with thickness **≤ `max_membrane_thickness_um`**.
- Those detected thin regions become membranes images and are **removed from exposure** in the generated image stack for those layers.

Practically, you can:

1. **Explicit membrane shape**: Provide a region that tightly bounds the intended membrane; if it is <= max_membrane_thickness_um this becomes a membrane.
2. **Geometry-driven membrane detection**: Provide a broader mask and let the slicer find all thin regions (≤ `max_membrane_thickness_um`) within it.

```python
from openmfd import MembraneSettings, Cube

membrane_region = Cube((30, 30, 6)).translate((40, 40, 18))
device.add_label("membrane", Color.from_name("purple", 127))

device.add_regional_settings(
	name="valve_membrane",
	shape=membrane_region,
	settings=MembraneSettings(
		max_membrane_thickness_um=20.0,
		bulk_exposure_multiplier=0.4,
		dilation_px=1,
		defocus_um=20.0,
		on_film=False,
	),
	label="membrane",
)
```

**When to use:** microvalves or thin diaphragms that must remain flexible.

---

## 4) SecondaryDoseSettings region

Secondary dosing lets you add **extra exposure at edges or roofs** above features. This helps stiffen or seal critical regions.

```python
from openmfd import SecondaryDoseSettings, Cube

sec_region = Cube((50, 50, 10)).translate((25, 25, 20))
device.add_label("secondary_dose", Color.from_name("red", 127))

device.add_regional_settings(
	name="edge_roof_reinforcement",
	shape=sec_region,
	settings=SecondaryDoseSettings(
		edge_bulk_exposure_multiplier=0.27,
		edge_erosion_px=1,
		edge_dilation_px=1,
		roof_bulk_exposure_multiplier=0.4,
		roof_erosion_px=0,
		roof_layers_above=3,
		roof_on_film=False,
	),
	label="secondary_dose",
)
```

**When to use:** sealing roof layers, stiffening channels, or improving print robustness.

---

## Regional settings vs defaults

- **Defaults** (Step 9) apply everywhere within component unless overridden.
- **Regional settings** apply only within their shapes.

If multiple controls apply, the priority is: **regional > component > defaults**.

---

## Common pitfalls

- Shapes must be within the device volume.
- Regional settings will not affect subcomponents
- Use distinct labels so you can inspect regions visually.

---

Next: [Extra 1: Customizing Subcomponent Labels and Colors](e1-recoloring_components.md)