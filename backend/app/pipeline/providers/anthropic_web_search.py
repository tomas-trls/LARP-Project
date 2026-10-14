"""
Search engine "anthropic_web_search": Claude's built-in web search tool.

We ask Claude to search the web for one query. Anthropic runs the search on its own
servers and returns a list of pages; we keep each page's title and link as a candidate.
(We do not trust Claude's wording: the pages are opened and checked separately.)

Needs ANTHROPIC_API_KEY. Costs money per search, so a cap on searches per query is set.
"""

import logging
from typing import Callable, List, Optional

from app.pipeline.base import SearchHit, SearchProvider, register_provider
from app.settings import ANTHROPIC_API_KEY, EVENT_SEARCH_MODEL

log = logging.getLogger("pipeline.web_search")

MAX_SEARCHES_PER_QUERY = 3
MAX_CONTINUATIONS = 3  # the API may pause a long search; we let it carry on this many times

PROMPT = (
    "Find web pages for individual, upcoming, in-person events for university students that match this search: "
    "\"{query}\". Prefer the event's own page on Eventbrite, Meetup, a university or student union site, "
    "an employer's student-events page or a venue's own site, rather than list pages or articles. "
    "Search, then reply with one short line saying how many pages you found."
)


def make_client():
    import anthropic

    return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


@register_provider("anthropic_web_search")
class AnthropicWebSearchProvider(SearchProvider):
    def __init__(self, client_factory: Callable = make_client, model: str = EVENT_SEARCH_MODEL, **_ignored):
        self._client_factory = client_factory
        self._client = None
        self.model = model
        self.searches = 0  # how many queries were run
        self.input_tokens = 0
        self.output_tokens = 0
        self.web_searches = 0  # how many individual web searches Anthropic ran for us (these are billed separately)

    def search(self, query: str) -> List[SearchHit]:
        if self._client is None:
            self._client = self._client_factory()
        self.searches += 1

        messages = [{"role": "user", "content": PROMPT.format(query=query)}]
        hits: List[SearchHit] = []
        for _ in range(MAX_CONTINUATIONS + 1):
            response = self._client.messages.create(
                model=self.model,
                max_tokens=4000,
                output_config={"effort": "low"},
                tools=[{
                    "type": "web_search_20260209",
                    "name": "web_search",
                    "max_uses": MAX_SEARCHES_PER_QUERY,
                    "user_location": {"type": "approximate", "city": "London", "country": "GB", "timezone": "Europe/London"},
                }],
                messages=messages,
            )
            self._count(response)
            hits.extend(self._hits_from(response))
            if response.stop_reason != "pause_turn":
                break
            messages = [messages[0], {"role": "assistant", "content": response.content}]  # let it carry on
        return hits

    def _count(self, response) -> None:
        usage = getattr(response, "usage", None)
        if usage is None:
            return
        self.input_tokens += getattr(usage, "input_tokens", 0) or 0
        self.output_tokens += getattr(usage, "output_tokens", 0) or 0
        server_tools = getattr(usage, "server_tool_use", None)
        self.web_searches += getattr(server_tools, "web_search_requests", 0) or 0

    @staticmethod
    def _hits_from(response) -> List[SearchHit]:
        """Pull the pages out of the web_search_tool_result blocks. Errors come back as a block, not an exception."""
        hits = []
        for block in response.content:
            if getattr(block, "type", "") != "web_search_tool_result":
                continue
            content = block.content
            if not isinstance(content, list):  # an error object, e.g. too many searches
                log.warning("Web search returned an error: %s", getattr(content, "error_code", content))
                continue
            for result in content:
                url = getattr(result, "url", None)
                if url:
                    hits.append(SearchHit(title=getattr(result, "title", "") or "", url=url, snippet=getattr(result, "page_age", "") or ""))
        return hits
