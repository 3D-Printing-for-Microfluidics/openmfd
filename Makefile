SHELL := /usr/bin/env bash
.ONESHELL:

PYTHON ?= python3
VENV_DIR ?= .venv2
PIP ?= $(VENV_DIR)/bin/pip
UV ?= uv

.PHONY: init build serve mem-profile py-profile run

init:
	set -e
	$(PYTHON) - <<-'PY'
	import sys
	v = sys.version_info
	if not ((3, 8) <= (v.major, v.minor) <= (3, 13)):
	    raise SystemExit(f"Unsupported Python {v.major}.{v.minor}. Use 3.8-3.13.")
	print(f"Python {v.major}.{v.minor} OK")
	PY
	if ! command -v $(UV) >/dev/null 2>&1; then
		echo "uv not found.";
		read -r -p "Install uv? [y/N] " ans; \
		if [[ $$ans =~ ^[Yy]$$ ]]; then
			$(PYTHON) -m pip install -U uv;
		else
			echo "Skipping uv install.";
		fi
	fi
	$(PYTHON) -m venv $(VENV_DIR)
	source $(VENV_DIR)/bin/activate
	$(PIP) install -U pip
	$(PIP) install -e ".[dev]"
	@echo "Activated venv at $(VENV_DIR)."

build:
	set -e
	mkdocs build
	$(UV) build

serve:
	omfd

mem-profile:
	set -e
	if [[ -z "$(FILE)" ]]; then echo "Usage: make mem-profile FILE=path/to/script.py"; exit 1; fi
	module=$$($(PYTHON) - <<-'PY'
	import os, sys
	path = sys.argv[1]
	path = os.path.normpath(path)
	if path.endswith('.py'):
	    path = path[:-3]
	path = path.lstrip('./')
	if path.startswith('src' + os.sep):
	    path = path[4:]
	print(path.replace(os.sep, '.'))
	PY
	"$(FILE)")
	heaptrack $(PYTHON) -m $$module

py-profile:
	set -e
	if [[ -z "$(FILE)" ]]; then echo "Usage: make py-profile FILE=path/to/script.py"; exit 1; fi
	module=$$($(PYTHON) - <<-'PY'
	import os, sys
	path = sys.argv[1]
	path = os.path.normpath(path)
	if path.endswith('.py'):
	    path = path[:-3]
	path = path.lstrip('./')
	if path.startswith('src' + os.sep):
	    path = path[4:]
	print(path.replace(os.sep, '.'))
	PY
	"$(FILE)")
	$(PYTHON) -m cProfile -o prof.prof -m $$module

run:
	set -e
	if [[ -z "$(FILE)" ]]; then echo "Usage: make run FILE=path/to/script.py"; exit 1; fi
	module=$$($(PYTHON) - <<-'PY'
	import os, sys
	path = sys.argv[1]
	path = os.path.normpath(path)
	if path.endswith('.py'):
	    path = path[:-3]
	path = path.lstrip('./')
	if path.startswith('src' + os.sep):
	    path = path[4:]
	print(path.replace(os.sep, '.'))
	PY
	"$(FILE)")
	time $(PYTHON) -m $$module
