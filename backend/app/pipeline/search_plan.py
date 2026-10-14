"""
WHAT we search for: the places and the categories. This is plain data, so you can
edit it without touching any logic. The words are explained in docs/EVENT_SEARCH_LOGIC.md.

Order matters: places are searched in the order listed, so UCL comes first and
Canary Wharf after it.
"""

# Where to look. `key` matches the "area" column in the events table.
AREAS = [
    {"key": "main", "label": "UCL Bloomsbury", "terms": "UCL Bloomsbury London WC1"},
    {"key": "canary", "label": "Canary Wharf", "terms": "Canary Wharf London E14"},
]

# What to look for: one entry per interest subgroup in tags.json, so whatever we find
# already fits our tag list. `kind` decides the wording: career categories are searched
# with career words, social ones with social words.
CATEGORIES = [
    {"name": "Business and quant", "kind": "career", "keywords": "finance banking consulting entrepreneurship data analytics"},
    {"name": "Tech", "kind": "career", "keywords": "software AI machine learning product design tech"},
    {"name": "Law and society", "kind": "career", "keywords": "law politics policy sustainability"},
    {"name": "Health and science", "kind": "career", "keywords": "healthcare biomedical science engineering psychology"},
    {"name": "Racquet sports", "kind": "social", "keywords": "padel tennis"},
    {"name": "Team sports", "kind": "social", "keywords": "football basketball"},
    {"name": "Fitness", "kind": "social", "keywords": "gym running boxing fitness"},
    {"name": "Games and strategy", "kind": "social", "keywords": "chess board games video games esports"},
    {"name": "Creative", "kind": "social", "keywords": "photography music film theatre writing"},
    {"name": "Food and drink", "kind": "social", "keywords": "food cafes street food supper club pub"},
    {"name": "Nightlife and music", "kind": "social", "keywords": "club night live music gig"},
    {"name": "Activities", "kind": "social", "keywords": "bowling arcade parks outdoors museum comedy"},
]

# The wording added to each search, by kind.
CAREER_WORDS = "talk networking fair workshop panel employer event"
SOCIAL_WORDS = "social meetup night tournament class"
