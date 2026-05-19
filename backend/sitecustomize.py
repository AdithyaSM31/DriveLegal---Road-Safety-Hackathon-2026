"""Site customizations for DriveLegal.

When running Python from inside the `backend/` folder, imports like
`from backend.core...` may fail because the parent directory isn't on sys.path.

This module is auto-imported by Python's `site` mechanism if present.
"""

from __future__ import annotations

import os
import sys

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_THIS_DIR)

# Ensure the project root (parent of backend/) is importable
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

# If we are executing from inside backend/, importing `backend` would try to
# resolve `backend/backend` (non-existent). Create an alias so
# `import backend` resolves to this directory.
if os.path.basename(_THIS_DIR) == "backend":
    # Register this module as `backend` if needed
    try:
        import importlib.util
        import types

        if "backend" not in sys.modules:
            pkg = types.ModuleType("backend")
            pkg.__path__ = [_THIS_DIR]
            pkg.__file__ = os.path.join(_THIS_DIR, "__init__.py")
            sys.modules["backend"] = pkg
    except Exception:
        pass


