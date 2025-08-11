# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static web application called "WuWa Team Recommender (Inventory Viewer MVP)" - a local inventory viewer for Wuthering Waves game data. It processes JSON files exported from the WuWa Inventory Kamera tool to display characters, weapons, echoes, and items in a user-friendly interface.

## Architecture

The project is a client-side only application with no build system or server dependencies:

- **Static HTML/CSS/JS**: No build tools, bundlers, or package managers
- **Single Page Application**: All functionality contained in three files
- **CDN Dependencies**: Tailwind CSS and Google Fonts loaded via CDN
- **Local Data Processing**: JSON files are processed entirely in the browser

### Core Files

- `index.html` - Main UI layout with Tailwind CSS via CDN and Inter font
- `app.js` - Core application logic (750+ lines handling file parsing, data normalization, rendering)
- `styles.css` - Custom CSS for additional styling and component classes
- `data/` - Game data reference files and character/weapon/echo icons
- `sampleuploads/` - Example JSON files exported from WuWa Inventory Kamera

### Key Application Components

**Data Layer:**
- `store` object: In-memory storage for characters, weapons, echoes, items
- `mapping` object: ID-to-name mappings and icon file references loaded from `data/` folder
- File type detection: Heuristic detection of JSON file types by structure and filename

**UI Layer:**
- Drag & drop interface for JSON file uploads
- Search functionality for each item category  
- Dynamic rendering of inventory items with icons and stats
- Summary cards showing total counts per category

**Data Processing:**
- `normalizeAndMerge()`: Handles various JSON structures from different WuWa Inventory Kamera export formats
- `detectType()`: Auto-detects whether uploaded JSON contains characters, weapons, echoes, or items
- `buildIdMapsFromRaw()`: Creates lookup tables from reference data files

## Usage

Since this is a static site with no build process:

1. **Development**: Open `index.html` directly in browser or serve via simple HTTP server
2. **No installation needed**: All dependencies loaded via CDN
3. **Local testing**: Use Python's built-in server: `python -m http.server 8000`

## Data Structure

The application expects JSON files exported from WuWa Inventory Kamera tool with these formats:
- Characters: `characters_wuwainventorykamera.json`
- Weapons: `weapons_wuwainventorykamera.json` 
- Echoes: `echoes_wuwainventorykamera.json`
- Items: `inventory_wuwainventorykamera.json`

Reference data files in `data/` provide ID-to-name mappings and are automatically loaded when served via HTTP.

## Character Icon System

Character icons are mapped using a hardcoded lookup table in `app.js:570-604` that maps character IDs to their corresponding icon filenames in `data/Images/CharacterIcons/`. The system expects WebP format icons following the naming pattern `T_IconRoleHead256_XX_UIYYYY.webp`.