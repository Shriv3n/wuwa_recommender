# WuWa Team Recommender (Inventory Viewer MVP)

A simple static web app to locally view the JSON output from WuWa Inventory Kamera (characters, weapons, echoes, resources, dev items). Drag & drop the JSON files onto the page to visualize your current inventory.

## How to Use

1. Open `index.html` in your browser (double-click or right-click > Open With > your browser).
2. Click "Select JSON Files" or drag & drop your Inventory Kamera JSON files into the drop zone.
3. The page will summarize totals and render lists for Characters, Weapons, Echoes, Resources, and Development Items.
4. Use the search bars in each section to quickly find items.
5. Click "Clear" to reset the in-memory data.

## Notes

- This is a static site; no data leaves your machine.
- File type detection is heuristic and based on structure and filename cues.
- Next iterations will compute derived stats and add team recommendations.

## Project Structure

- `index.html` — UI layout and Tailwind + Inter fonts via CDN.
- `styles.css` — small custom styles for polish.
- `app.js` — file parsing, type detection, normalization, and rendering.

## Roadmap

- Derived stats computation (HP, Crit%, Crit DMG%, ER%, ATK, Elemental DMG%).
- Basic team recommender heuristics.
- Import/Export a single merged inventory snapshot.
- Optional local server & persistence.
