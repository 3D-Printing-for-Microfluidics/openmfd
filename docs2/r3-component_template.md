Prev: [Table of Contents](0-TOC.md), [Part 8: Designing Custom Subcomponents](8-making_subcomponent.md)

```python

import inspect
# import classes from openmfd

# import components from custom classes or openmfd.component_library

class ***MyComponent***(***Component or VariableLayerThicknessComponent***):
    def __init__(self, ***component_parameters***):
        # Store constructor arguments for equality comparison.
        frame = inspect.currentframe()
        args, _, _, values = inspect.getargvalues(frame)
        self.init_args = [values[arg] for arg in args if arg != "self"]
        self.init_kwargs = {arg: values[arg] for arg in args if arg != "self"}

        # Initialize the base Component
        super().__init__(
            size=#component size tuple
            position=(0, 0, 0),
            px_size=#component pixel size
            layer_size=#component layer size
        )

		# Add slicing settings (bulk exposure, default settings, etc)

		# Add labels

        # Add voids

		# Add regional settings

		# Add bulk

		# Add ports

if __name__ == "__main__":
    ***MyComponent***().preview()

```