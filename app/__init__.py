
"""Top-level app package."""

# The packaging configuration expects this attribute to be defined during
# installation.  Without it, ``setup.py`` fails with a ``KeyError`` when trying
# to read the project's version.  A simple static value keeps the build step
# working even when the package is installed in isolation.
__version__ = "0.1.0"

__all__ = ["__version__"]
