# Deslop

Hide low effort AI slop posts on LinkedIn. Other sites planned, but this is mainly for LinkedIn.

Runs entirely locally in your browser, no API keys needed or HTTP requests.

## How it works

Deslop scans the LinkedIn feed as you scroll and scores text blocks against a set of heuristics. If a post crosses the sensitivity threshold, it is replaced with a soft-collapse banner. You can still click to reveal the original post if needed.

The scoring engine checks for:
- Known AI filler phrases and sycophantic openers.
- Sentence length variance (burstiness).
- Lexical diversity (type-token ratio).
- Readability metrics (Flesch-Kincaid).
- High emoji density and structural patterns (like one-sentence-per-line formatting).

It uses a structural DOM traversal to identify post containers, making it resilient to LinkedIn's randomized CSS classes.

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable "Developer mode" in the top right corner.
4. Click "Load unpacked" and select the directory containing these files.

### I may add this to the chrome web store later.

## Usage

Click the extension icon in your browser toolbar to open the popup. From there, you can:
- View stats on how many posts have been scanned and hidden.
- Adjust the sensitivity slider.
- Pause the filter. 

## License

This project is licensed under the terms of the LICENSE file included in the repository.
