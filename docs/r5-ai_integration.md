# Integrating llms.txt with AI tools

Use llms.txt (or llms-full.txt for the complete set) as a public, versioned source of truth for OpenMFD documentation. Most AI tools can consume these URLs when you provide them as context.

## Quick start

1. Decide which endpoint you want to expose:
	- llms.txt (shorter, curated)
	- llms-full.txt (complete)
2. Add the URL to your AI tool’s context, prompt, or config.
3. Ask questions that reference OpenMFD workflows or APIs.

Replace the placeholders below with your published docs domain:

- https://openmfd.readthedocs.io/latest/llms.txt
- https://openmfd.readthedocs.io/latest/llms-full.txt

## VS Code GitHub Copilot

Add a workspace instruction so Copilot can pull in the docs:

1. Create .copilot-instructions.md in the repository root.
2. Add a short note pointing to the docs URL and the focus area.

Example:

```
Copilot Instructions

Use OpenMFD docs at https://openmfd.readthedocs.io/latest/llms-full.txt.
Prefer guidance on component structure, labels, ports, and slicer settings.
```

## Chat-based AI (Gemini, ChatGPT, etc.)

Include the URL in the prompt so the model has a canonical reference:

```
I’m working on OpenMFD. Use https://openmfd.readthedocs.io/latest/llms-full.txt as reference and suggest a component layout with labels, ports, and subcomponents.
```

## Model Context Protocol (MCP)

MCP-enabled tools can ingest llms.txt endpoints as external resources. Add the URL to the tool’s resource list so the model can pull the docs on demand. This enables consistent answers about component structure, settings, and slicer output without manually pasting documentation into each prompt.
