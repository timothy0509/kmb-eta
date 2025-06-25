# TimoETA

A lightweight, responsive single‐page application for fetching and displaying real‐time Estimated Time of Arrival (ETA) data for Kowloon Motor Bus (KMB) stops in Hong Kong.  
Built with plain HTML, CSS (CSS Custom Properties + flex/grid), and vanilla JavaScript—no frontend framework required.

---

## Table of Contents

1. [Project Overview](#project-overview)  
2. [Features](#features)  
3. [Getting Started](#getting-started)  
   1. [Prerequisites](#prerequisites)  
   2. [Installation](#installation)  
   3. [Running Locally](#running-locally)  
4. [Usage](#usage)  
   1. [Main Page (`index.html`)](#main-page-indexhtml)  
   2. [Predefined Stops Page (`singyin.html`)](#predefined-stops-page-singyinhtml)  
5. [Project Structure](#project-structure)  
6. [Customization](#customization)  
7. [Contributing](#contributing)  
8. [License](#license)  
9. [Acknowledgments](#acknowledgments)  

---

## Project Overview

TimoETA provides a simple interface to:

- Search KMB bus stops by partial name.  
- Optionally filter by comma‐separated route numbers.  
- View up to three forthcoming ETAs per route, with “live” times highlighted.  
- See human-readable remarks (e.g. delays), annotated with which ETA they apply to.  
- Auto-refresh every 30 seconds without a full page reload.  
- Toggle between English, Traditional Chinese, and Simplified Chinese.  
- Choose light or dark theme (persisted in `localStorage`).  
- Adapt between desktop (table view) and mobile (card view) layouts.  

In addition to the main search UI (`index.html`), a secondary page (`singyin.html`) showcases a “preset” view for two fixed groups of stops at Sing Yin (Pak Hung House).

---

## Features

- **Single‐Page Application**: no full reloads—data is fetched via `fetch()`.  
- **Responsive Design**:  
  - Desktop: data in a styled `<table>`.  
  - Mobile: 80px‐tall “cards” laid out in a 3-column grid (route, destination, times).  
- **Light/Dark Themes**: CSS variables supply two palettes, toggled via a custom switch.  
- **Internationalization**: all labels, placeholders, buttons, and table headers switch between EN/TC/SC.  
- **Route Sorting**: alphanumeric routes (“14”, “14X”, “A1”, etc.) sorted logically.  
- **Auto-Refresh**: only ETA cells and remarks update, with a brief highlight animation when values change.  
- **Caching**:  
  - Full stop list cached on first load to reduce API calls.  
  - Last search parameters (stop name, route filter, language) saved in `localStorage` and re-run automatically on page load.  

---

## Getting Started

### Prerequisites

You only need a modern browser and a simple static file server (to avoid CORS issues when fetching JSON).

### Installation

```bash
# Clone this repository
git clone https://github.com/<YOUR_USERNAME>/timoeta.git
cd timoeta
```

### Running Locally

#### Option A: Python 3

```bash
python3 -m http.server 8000
# Then open http://localhost:8000/index.html
```

#### Option B: Node.js `serve` (or any static server)

```bash
npm install -g serve
serve .
# Visit the printed URL, e.g. http://localhost:5000/index.html
```

---

## Usage

### Main Page (`index.html`)

1. Open `index.html` in your browser (via the static server).  
2. Choose your language from the dropdown in the top-right.  
3. Toggle Dark Mode on/off.  
4. Enter a partial stop name (e.g. “Kai Yip Estate”).  
5. Optionally enter comma-separated route numbers (e.g. `14, 62P, 62X, 259D, X42C`).  
6. Click **Search ETAs**.  
7. View results in a table (desktop) or cards (mobile).  
8. The page auto-refreshes every 30 seconds, updating only changed cells.  
9. Your last search and theme preference are saved—reload the page and they’ll be restored & auto-searched.

### Predefined Stops Page (`singyin.html`)

A lightweight variant that requires **no** user input. It renders two static groups:

- **Pak Hung House – East Bound**  
- **Pak Hung House – West Bound**  

Each group displays all matching routes and ETAs for the hard-coded stop IDs.  
Language & theme toggles remain functional.

---

## Project Structure

```
timoeta/
├── index.html           # Main search SPA
├── singyin.html         # Preset-stop view (minor page)
├── README.md            # This documentation
├── styles/
│   └── style.css        # Global styles, theme variables, responsive layout
└── src/
    └── app.js           # Core JS: fetch, render, i18n, theming, auto-refresh
```

---

## Customization

- **Add a new “preset” page**:  
  1. Copy `singyin.html` → `yourpage.html`.  
  2. Update the `PRESETS` array at top of that file with your own groups.  

- **Modify language strings**: edit the `LANGS` object in `src/app.js`.  

- **Routes & colors**: adjust `.route-tag.route-XXX` rules in `styles/style.css`.  

- **Auto-refresh interval**: change `setInterval(refresh…, 30000)` in `app.js` / `singyin.html`.  

---

## Contributing

1. Fork the repo.  
2. Create a feature branch: `git checkout -b feature/YourFeature`.  
3. Commit your changes: `git commit -am "Add YourFeature"`.  
4. Push to the branch: `git push origin feature/YourFeature`.  
5. Open a Pull Request—describe your changes clearly.  

Please adhere to the existing code style (Prettier-formatted JS, CSS variables, ES6 syntax).

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## Acknowledgments

- KMB ETA API by etabus.gov.hk  
- Google Fonts: Roboto & Google Sans families  
- Inspired by Material Design principles for theming and layout.