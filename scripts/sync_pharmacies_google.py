"""
Sync South Carolina pharmacy chain locations from Google Places API.

Usage:
  1) Set environment variable:
       GOOGLE_MAPS_API_KEY=your_key_here
  2) Run:
       python scripts/sync_pharmacies_google.py

Output:
  - pharmacies.json (project root)

Notes:
  - Uses Places Text Search with pagination.
  - Deduplicates by place_id.
  - Filters to South Carolina by formatted address.
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Set


GOOGLE_TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_FILE = PROJECT_ROOT / "pharmacies.json"

# Add/remove chains as needed.
CHAIN_QUERIES = [
    "CVS Pharmacy in South Carolina",
    "Walgreens in South Carolina",
    "Walmart Pharmacy in South Carolina",
    "Publix Pharmacy in South Carolina",
    "Kroger Pharmacy in South Carolina",
    "Costco Pharmacy in South Carolina",
    "Sam's Club Pharmacy in South Carolina",
    "Target Pharmacy in South Carolina",
]


@dataclass
class Pharmacy:
    place_id: str
    name: str
    lat: float
    lng: float
    address: str
    phone: str = ""
    chain: str = ""

    def to_output(self) -> Dict[str, object]:
        return {
            "name": self.name,
            "lat": self.lat,
            "lng": self.lng,
            "address": self.address,
            "phone": self.phone,
            "chain": self.chain,
            "placeId": self.place_id,
        }


def get_api_key() -> str:
    key = os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()
    if not key:
        raise RuntimeError(
            "Missing GOOGLE_MAPS_API_KEY environment variable. "
            "Set it before running this script."
        )
    return key


def fetch_json(url: str, params: Dict[str, str]) -> Dict[str, object]:
    query = urllib.parse.urlencode(params)
    full_url = f"{url}?{query}"
    req = urllib.request.Request(full_url, headers={"User-Agent": "AffordRX/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            body = response.read().decode("utf-8")
            return json.loads(body)
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"HTTP error from Google Places API: {exc.code}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Network error calling Google Places API: {exc.reason}") from exc


def is_south_carolina_address(address: str) -> bool:
    normalized = address.lower()
    return ", sc" in normalized or "south carolina" in normalized


def infer_chain(name: str, query: str) -> str:
    # Prefer the chain encoded by the query, but fallback to name.
    q = query.lower()
    for chain in [
        "cvs",
        "walgreens",
        "walmart",
        "publix",
        "kroger",
        "costco",
        "sam's club",
        "target",
    ]:
        if chain in q:
            return chain.title()

    for chain in [
        "CVS",
        "Walgreens",
        "Walmart",
        "Publix",
        "Kroger",
        "Costco",
        "Sam's Club",
        "Target",
    ]:
        if chain.lower() in name.lower():
            return chain
    return "Other"


def fetch_chain_results(api_key: str, query: str) -> List[Dict[str, object]]:
    results: List[Dict[str, object]] = []
    page_token: Optional[str] = None

    while True:
        params = {"query": query, "key": api_key}
        if page_token:
            params["pagetoken"] = page_token

        payload = fetch_json(GOOGLE_TEXT_SEARCH_URL, params)
        status = str(payload.get("status", "UNKNOWN"))

        if status not in {"OK", "ZERO_RESULTS"}:
            if status == "INVALID_REQUEST" and page_token:
                # Google may need a short delay before page token is valid.
                time.sleep(2)
                continue
            raise RuntimeError(f"Google Places API returned status '{status}' for query '{query}'")

        page_results = payload.get("results", [])
        if isinstance(page_results, list):
            results.extend(page_results)

        next_page_token = payload.get("next_page_token")
        if not isinstance(next_page_token, str) or not next_page_token:
            break

        page_token = next_page_token
        # Required delay before the next token becomes valid.
        time.sleep(2)

    return results


def normalize_pharmacies(raw_results: List[Dict[str, object]], query: str) -> List[Pharmacy]:
    normalized: List[Pharmacy] = []
    for item in raw_results:
        place_id = str(item.get("place_id", "")).strip()
        name = str(item.get("name", "")).strip()
        formatted_address = str(item.get("formatted_address", "")).strip()
        geometry = item.get("geometry", {})
        location = geometry.get("location", {}) if isinstance(geometry, dict) else {}
        lat = location.get("lat")
        lng = location.get("lng")

        if not place_id or not name or not formatted_address:
            continue
        if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
            continue
        if not is_south_carolina_address(formatted_address):
            continue

        normalized.append(
            Pharmacy(
                place_id=place_id,
                name=name,
                lat=float(lat),
                lng=float(lng),
                address=formatted_address,
                chain=infer_chain(name, query),
            )
        )
    return normalized


def dedupe_pharmacies(pharmacies: List[Pharmacy]) -> List[Pharmacy]:
    seen: Set[str] = set()
    deduped: List[Pharmacy] = []
    for pharmacy in pharmacies:
        if pharmacy.place_id in seen:
            continue
        seen.add(pharmacy.place_id)
        deduped.append(pharmacy)
    return deduped


def save_output(pharmacies: List[Pharmacy]) -> None:
    payload = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": "Google Places Text Search API",
        "region": "South Carolina",
        "count": len(pharmacies),
        "pharmacies": [p.to_output() for p in pharmacies],
    }
    OUTPUT_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main() -> None:
    api_key = get_api_key()
    all_pharmacies: List[Pharmacy] = []

    print("Starting pharmacy sync for South Carolina...")
    for query in CHAIN_QUERIES:
        print(f"Querying: {query}")
        raw = fetch_chain_results(api_key, query)
        normalized = normalize_pharmacies(raw, query)
        print(f"  Raw results: {len(raw)} | SC normalized: {len(normalized)}")
        all_pharmacies.extend(normalized)

    deduped = dedupe_pharmacies(all_pharmacies)
    deduped.sort(key=lambda p: (p.chain.lower(), p.name.lower(), p.address.lower()))
    save_output(deduped)

    print(f"Done. Saved {len(deduped)} pharmacies to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
