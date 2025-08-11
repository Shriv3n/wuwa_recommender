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

## Credits and Attributions

This project builds upon and utilizes assets from the following sources:

### Data Sources
- **Game Data & Sample Files**: JSON data files in `./data/` and sample inventory files in `./sampleuploads/` are sourced from the [WuWa Inventory Kamera](https://github.com/Psycho-Marcus/WuWa_Inventory_Kamera) project by [Psycho-Marcus](https://github.com/Psycho-Marcus)
  - Original repository: https://github.com/Psycho-Marcus/WuWa_Inventory_Kamera
  - These files provide comprehensive game data mappings and reference information for Wuthering Waves

### Asset Sources  
- **Character & Weapon Icons**: All image assets in `./data/Images/` including character portraits, weapon icons, and UI elements are sourced from [Hakush.in Database](https://ww2.hakush.in)
  - Original website: https://ww2.hakush.in
  - These high-quality game assets enable the visual character portrait system

### Special Thanks
- **WuWa Inventory Kamera Project**: For creating the foundational tool that exports inventory data and providing comprehensive game data mappings
- **Hakush.in Database**: For maintaining and providing access to Wuthering Waves game assets and imagery

This project serves as a complementary web viewer for data exported from WuWa Inventory Kamera, with a focus on improving the user experience through visual character portraits and intuitive web interface.
