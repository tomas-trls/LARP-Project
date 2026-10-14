"""
Search STRATEGIES. Importing this package registers the built-in ones by name.

To add your own: create a new file here with a class that extends EventFinder, put
@register_finder("my_name") above it, and add one import line below.
Then set EVENT_FINDER=my_name in .env.
"""

from app.pipeline.finders import category_sweep, curated_file  # noqa: F401
