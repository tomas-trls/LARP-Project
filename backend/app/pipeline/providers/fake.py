"""
A pretend search engine for tests and dry runs: no internet, no key, no cost.

Give it a dictionary of {query text: [SearchHit, ...]}, or a function that takes a query
and returns hits. It also remembers every query it was asked, so tests can check them.
"""

from typing import Callable, Dict, List, Optional, Union

from app.pipeline.base import SearchHit, SearchProvider, register_provider


@register_provider("fake")
class FakeProvider(SearchProvider):
    def __init__(self, results: Optional[Union[Dict[str, List[SearchHit]], Callable[[str], List[SearchHit]]]] = None, **_ignored):
        self.results = results or {}
        self.queries: List[str] = []

    def search(self, query: str) -> List[SearchHit]:
        self.queries.append(query)
        if callable(self.results):
            return self.results(query)
        return list(self.results.get(query, []))
