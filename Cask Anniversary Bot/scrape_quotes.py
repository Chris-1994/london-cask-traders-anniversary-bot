#!/usr/bin/env python3
"""
Quotes to Scrape JS Scraper
===========================
This script scrapes quotes from https://quotes.toscrape.com/js.
For each quote, it saves the text, author name, and tags to quotes.json.

Structure:
- Section 1: Configuration
- Section 2: Storage Layer
- Section 3: Ingestion Layer
- Section 4: Parsing Layer
- Section 5: Orchestration (Main Execution Flow)
"""

import json
import os
import re
import time
import urllib.request
import urllib.error

# ---------------------------------------------------------
# Section 1: Configuration
# ---------------------------------------------------------
BASE_URL = "https://quotes.toscrape.com/js/page/{page}/"
OUTPUT_FILE = "quotes.json"
MAX_PAGES = 10  # Full scraping run.
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# ---------------------------------------------------------
# Section 2: Storage Layer
# ---------------------------------------------------------
def load_existing_quotes(file_path):
    """Loads existing quotes from the JSON file if it exists."""
    if not os.path.exists(file_path):
        return []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
    except json.JSONDecodeError:
        print(f"Warning: {file_path} exists but is not valid JSON. Starting fresh.")
    return []

def save_quotes_atomically(file_path, quotes):
    """Saves the list of quotes atomically to the JSON file."""
    temp_file = file_path + ".tmp"
    try:
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(quotes, f, ensure_ascii=False, indent=2)
        os.replace(temp_file, file_path)
    except Exception as e:
        print(f"Error saving quotes atomically: {e}")
        if os.path.exists(temp_file):
            os.remove(temp_file)

# ---------------------------------------------------------
# Section 3: Ingestion Layer
# ---------------------------------------------------------
def fetch_page_html(url, retries=3, delay=2):
    """Fetches HTML content from the given URL with retry logic."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                return response.read().decode("utf-8")
        except urllib.error.URLError as e:
            print(f"Attempt {attempt} failed to fetch {url}: {e}")
            if attempt < retries:
                time.sleep(delay * attempt)
            else:
                raise

# ---------------------------------------------------------
# Section 4: Parsing Layer
# ---------------------------------------------------------
def extract_quotes_from_html(html):
    """
    Extracts quote data from the JavaScript block in the HTML page.
    Matches the 'var data = [...];' pattern.
    """
    # Regex to find the Javascript 'var data = [ ... ];' content
    pattern = r"var data = (\[.*?\]);\s*\n"
    match = re.search(pattern, html, re.DOTALL)
    if not match:
        raise ValueError("Could not find quote data block in the HTML script tag.")
    
    js_array_str = match.group(1)
    
    try:
        raw_quotes = json.loads(js_array_str)
        return raw_quotes
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse extracted Javascript array as JSON: {e}")

def normalize_quotes(raw_quotes):
    """Normalizes the raw quote objects to the required schema: text, author, tags."""
    normalized = []
    for q in raw_quotes:
        text = q.get("text", "")
        # Extract author name as a string from the author dictionary
        author_data = q.get("author", {})
        author_name = author_data.get("name", "") if isinstance(author_data, dict) else str(author_data)
        tags = q.get("tags", [])
        
        normalized.append({
            "text": text,
            "author": author_name,
            "tags": tags
        })
    return normalized

# ---------------------------------------------------------
# Section 5: Orchestration (Main Execution Flow)
# ---------------------------------------------------------
def scrape_quotes():
    """Main function to run the scraping process."""
    print(f"Starting scraper. Target: {BASE_URL.format(page='1-10')}")
    print(f"Current page limit: {MAX_PAGES}")
    
    # Load existing quotes to avoid duplicates
    all_quotes = load_existing_quotes(OUTPUT_FILE)
    existing_texts = {q["text"] for q in all_quotes}
    print(f"Loaded {len(all_quotes)} existing quotes from {OUTPUT_FILE}")
    
    new_quotes_added = 0
    
    for page in range(1, MAX_PAGES + 1):
        url = BASE_URL.format(page=page)
        print(f"Fetching page {page}: {url}")
        
        try:
            html = fetch_page_html(url)
            raw_quotes = extract_quotes_from_html(html)
            page_quotes = normalize_quotes(raw_quotes)
            
            # Filter and append new quotes
            page_new_quotes = []
            for quote in page_quotes:
                if quote["text"] not in existing_texts:
                    page_new_quotes.append(quote)
                    existing_texts.add(quote["text"])
            
            if page_new_quotes:
                all_quotes.extend(page_new_quotes)
                new_quotes_added += len(page_new_quotes)
                # Save immediately after each page is scraped (Scraping Rule 1)
                save_quotes_atomically(OUTPUT_FILE, all_quotes)
                print(f"Saved {len(page_new_quotes)} new quotes from page {page} to {OUTPUT_FILE}.")
            else:
                print(f"No new quotes found on page {page}.")
                
            # Respectful scraping delay
            time.sleep(1)
            
        except Exception as e:
            print(f"Error scraping page {page}: {e}")
            
    print(f"Scraping run completed. Added {new_quotes_added} new quotes. Total in file: {len(all_quotes)}")

if __name__ == "__main__":
    scrape_quotes()
