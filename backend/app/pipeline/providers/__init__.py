"""
Search ENGINES. Importing this package registers the built-in ones by name.

To add your own: create a new file here with a class that extends SearchProvider, put
@register_provider("my_name") above it, and add one import line below.
Then set EVENT_SEARCH_PROVIDER=my_name in .env.
"""

from app.pipeline.providers import anthropic_web_search, fake  # noqa: F401
