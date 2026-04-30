import re
from supabase import create_client, Client
from config import settings


def _normalize_url(url: str) -> str:
    # supabase-py appends /rest/v1 itself; strip it (and trailing slashes) if
    # the user accidentally included it in the env var.
    url = url.rstrip("/")
    url = re.sub(r"/rest/v1$", "", url)
    return url


_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        base_url = _normalize_url(settings.supabase_url)
        _client = create_client(base_url, settings.supabase_service_role_key)
    return _client


supabase = get_supabase()
