# Customizing Labels and Colors
Prev: [Part 12: Configuring Regional Settings](12-regional_settings.md)

This section explains how to **relabel** shapes and labels so colors are consistent across a full device, including nested subcomponents.

Relabeling uses a single function:

`relabel(mapping)`

The `mapping` keys can be:

- a `Shape` instance
- a string name (shape name or label name)
- a fully qualified name (FQN) like `subcomponent.shape` or `subcomponent.label`

All new labels must exist in `component.labels` (use `add_label()` to create them first).

---

## Labels with prefixes (FQNs)

When a component is added as a subcomponent, all labels are **prefixed** with the subcomponent name.

Example:

- Original label: `control`
- Subcomponent name: `valve`
- Prefixed label: `valve.control`

This allows the visualizer to distinguish hierarchy levels. Relabeling is recursive; prefixed labels are replaced with the destination label.

---

## Examples

### Relabel a specific shape

```python
# Relabel a specific shape object
device.relabel({some_shape: "fluidic"})
```

### Relabel by shape name (current component)

```python
# Relabel a shape by its name in the current component
device.relabel({"channel_void": "fluidic"})
```

### Relabel by fully qualified shape name

```python
# Relabel a shape inside a subcomponent
device.relabel({"valve.channel_void": "control"})
```

### Relabel a label (all shapes with label)

```python
# Recursivly relabel a label (all pneumatics become controls)
device.relabel({"pneumatic": "control"})
```

### Relabel by fully qualified label name

```python
# Relabel a prefixed label
device.relabel({"valve.pneumatic": "control"})
# Shapes labeled "valve.pneumatic" become "control"
```

---

## Why relabel at all?

Relabeling makes multi‑component devices readable and consistent:

- All fluidic channels can share one color
- All pneumatic/control lines can share another
- You can override library defaults without editing the library code

This also makes debugging much easier.

---

Next: [Extra 2: Variable Layer Thickness Components](e2-variable_layer_thickness_components.md)
