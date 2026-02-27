# Integrating llms.txt with AI tools

Use llms.txt (or llms-full.txt for the complete set) as a public, versioned source of truth for PyMFCAD documentation. Most AI tools can consume these URLs when you provide them as context.

## Quick start

1. Decide which endpoint you want to expose:
	- llms.txt (shorter, curated)
	- llms-full.txt (complete)
2. Add the URL to your AI tool’s context, prompt, or config.
    - https://pymfcad.readthedocs.io/latest/llms.txt
    - https://pymfcad.readthedocs.io/latest/llms-full.txt
3. Ask questions that reference PyMFCAD workflows or APIs.

## VS Code GitHub Copilot

Add a workspace instruction so Copilot can pull in the docs:

1. Create .copilot-instructions.md in the repository root.
2. Add a short note pointing to the docs URL and the focus area.

Example:

```
Copilot Instructions

Use PyMFCAD docs at https://pymfcad.readthedocs.io/latest/llms-full.txt.
Prefer guidance on component structure, labels, ports, and slicer settings.
```

## Chat-based AI (Gemini, ChatGPT, etc.)

Include the URL in the prompt so the model has a canonical reference:

```
I’m working on PyMFCAD. Use https://pymfcad.readthedocs.io/latest/llms-full.txt as reference and suggest a component layout with labels, ports, and subcomponents.
```

## Model Context Protocol (MCP)

MCP-enabled tools can ingest llms.txt endpoints as external resources. Add the URL to the tool’s resource list so the model can pull the docs on demand. This enables consistent answers about component structure, settings, and slicer output without manually pasting documentation into each prompt.
