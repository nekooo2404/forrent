import re
import unicodedata


EMOJI_RE = re.compile("[\U0001f300-\U0001faff\u2600-\u27bf\ufe0f\u200d]")
INTERNAL_PREFIX_RE = re.compile(
    r"^\s*(?:ma\s+phong\s*)?(?:\[[^\]]+\]|\(?[a-z]\d+(?:[.\-]\d+)?\)?"
    r"(?:\s*[,/&+]\s*\(?[a-z]\d+(?:[.\-]\d+)?\)?)*)\s*(?:[-\u2013\u2014|:]\s*|(?=\w))",
    re.IGNORECASE,
)
CODE_ONLY_RE = re.compile(r"^(?:phong\s*)?[a-z]?\d+[a-z]?(?:\s*[,/&+-]\s*[a-z]?\d+[a-z]?)*$", re.IGNORECASE)
MARKETING_PREFIXES = (
    ("khai", "truong"),
    ("moi", "len", "san"),
    ("sieu", "pham"),
)
STATUS_SUFFIXES = (
    ("con", "trong"),
    ("trong",),
    ("da", "thue"),
    ("het", "phong"),
)

GENERIC_TITLE_KEYS = {
    "phong cho thue",
    "trong o duoc ngay",
    "can ho dich vu",
    "chung cu mini",
    "nha nguyen can",
}
ROOM_CODE_RE = re.compile(r"\b(?:p|phong|room|can|ma)?\s*[-_.]?\s*\d{2,}[a-z]?\b", re.IGNORECASE)


def _ascii_key(value):
    decomposed = unicodedata.normalize("NFD", value)
    without_marks = "".join(char for char in decomposed if unicodedata.category(char) != "Mn")
    return without_marks.replace("\u0111", "d").replace("\u0110", "D").casefold()


def normalize_search_text(*values):
    """Return a stable, accent-insensitive search document."""
    normalized = " ".join(str(value or "") for value in values)
    normalized = _ascii_key(unicodedata.normalize("NFKC", normalized))
    return re.sub(r"[^a-z0-9]+", " ", normalized).strip()


def _word_keys(value):
    return re.findall(r"\w+", _ascii_key(value), flags=re.UNICODE)


def _strip_known_prefixes(value):
    result = value.strip()
    changed = True
    while changed:
        changed = False
        keys = _word_keys(result)
        for phrase in MARKETING_PREFIXES:
            if keys[: len(phrase)] != list(phrase):
                continue
            pattern = r"^\W*" + r"\W+".join(r"\w+" for _ in phrase) + r"\W*"
            result = re.sub(pattern, "", result, count=1, flags=re.UNICODE).strip()
            changed = True
            break
    return result


def _strip_known_suffixes(value):
    result = value.strip()
    keys = _word_keys(result)
    for phrase in STATUS_SUFFIXES:
        if keys[-len(phrase) :] != list(phrase):
            continue
        pattern = r"\W*" + r"\W+".join(r"\w+" for _ in phrase) + r"\W*$"
        return re.sub(pattern, "", result, count=1, flags=re.UNICODE).strip()
    return result


def _expand_room_type_acronyms(value):
    replacements = {
        "ccmn": "chung c\u01b0 mini",
        "ccdv": "c\u0103n h\u1ed9 d\u1ecbch v\u1ee5",
    }
    words = []
    for word in value.split(" "):
        expanded = replacements.get(word.casefold())
        if expanded:
            words.append(expanded.capitalize() if not words else expanded)
        else:
            words.append(word)
    return " ".join(words)


def public_room_title(value, proper_nouns=None, fallback="Ph\u00f2ng cho thu\u00ea"):
    title = value or ""
    title = EMOJI_RE.sub(" ", title)
    title = INTERNAL_PREFIX_RE.sub("", title)
    title = _strip_known_prefixes(title)
    title = _strip_known_suffixes(title)
    title = re.sub(r"\s+", " ", title).strip()

    if not title or CODE_ONLY_RE.fullmatch(title):
        return fallback

    letters = "".join(char for char in title if char.isalpha())
    if letters and letters == letters.upper():
        title = title.lower().capitalize()
        title = re.sub(r"\b(ccmn|ccdv|wifi)\b", lambda match: match.group(1).upper(), title, flags=re.IGNORECASE)

    for proper_noun in proper_nouns or []:
        if not proper_noun:
            continue
        title = re.sub(re.escape(str(proper_noun)), str(proper_noun), title, flags=re.IGNORECASE)

    return _expand_room_type_acronyms(title)


def public_room_title_for(room):
    proper_nouns = [
        room.city.name if getattr(room, "city_id", None) else "",
        room.ward.name if getattr(room, "ward_id", None) else "",
    ]
    descriptor = (
        room.room_subtype.name
        if getattr(room, "room_subtype_id", None)
        else room.get_room_type_display()
    )
    location = next((value for value in reversed(proper_nouns) if value), "H\u00e0 N\u1ed9i")
    cleaned = public_room_title(room.title, proper_nouns=proper_nouns, fallback=descriptor)
    cleaned_key = normalize_search_text(cleaned)
    descriptor_key = normalize_search_text(descriptor)

    if cleaned_key in GENERIC_TITLE_KEYS or cleaned_key == descriptor_key:
        cleaned = descriptor

    location_key = normalize_search_text(location)
    if location_key and location_key not in normalize_search_text(cleaned):
        cleaned = f"{cleaned} t\u1ea1i {location}"

    return cleaned[:90].strip()


def public_room_description(value, fallback=""):
    description = EMOJI_RE.sub(" ", value or "")
    description = ROOM_CODE_RE.sub(" ", description)
    cleaned_lines = []
    for raw_line in description.splitlines():
        line = re.sub(r"[ \t]+", " ", raw_line).strip(" -|\u2022")
        if not line:
            continue
        if normalize_search_text(line) in {"con trong", "da thue", "het phong"}:
            continue
        cleaned_lines.append(line)
    cleaned = "\n".join(cleaned_lines).strip()
    return cleaned or fallback


def room_search_document(room):
    return normalize_search_text(
        room.title,
        public_room_title_for(room),
        room.get_room_type_display(),
        room.room_subtype.name if getattr(room, "room_subtype_id", None) else "",
        room.city.name if getattr(room, "city_id", None) else "",
        room.ward.name if getattr(room, "ward_id", None) else "",
        room.address,
        room.short_description,
        room.description,
    )
