# Changelog

All notable changes to the WuWa Team Recommender project will be documented in this file.

## [2025-08-11] - Character Portrait Image Fix

### Added
- **Character portrait image system**: Implemented proper character icon display functionality
- **Hardcoded character mapping**: Added comprehensive mapping of character IDs to their corresponding icon files
- **Special character support**: Added support for "zaira" (main character) with dedicated icon mapping
- **Robust image path handling**: Implemented proper image path construction and loading
- **Enhanced debugging**: Added extensive console logging for character icon lookup process

### Fixed
- **Image loading issue**: Fixed character portraits not displaying when uploading JSON files
- **Path construction bug**: Resolved duplicate path prefixing that caused incorrect image URLs
- **Mapping preservation**: Fixed issue where hardcoded character mappings were being overwritten by empty data
- **Character ID extraction**: Enhanced character ID detection from various JSON structures including string keys like "zaira"
- **Data structure conflicts**: Resolved issue where `mapping.characterIcons.idToFile` was initialized as array instead of object

### Changed
- **Character normalization**: Updated character data processing to store `_rawKey` for better ID lookup
- **Mapping initialization**: Refactored character icon mapping to always be available regardless of data file loading success
- **buildIdMapsFromRaw function**: Modified to preserve existing hardcoded mappings when processing additional data sources

### Technical Details
- **Server setup**: Configured local HTTP server on port 8080 to properly serve image assets
- **File structure**: Character icons located in `./data/Images/CharacterIcons/` with naming pattern `T_IconRoleHead256_XX_UIYYYY.webp`
- **Mapping coverage**: Added 33+ character ID to filename mappings including all characters from sample JSON file
- **Error handling**: Improved fallback behavior when character icons cannot be found

### Files Modified
- `app.js`: 
  - Added `createHardcodedCharacterIconMapping()` function
  - Modified `tryLoadMappingFromDataFolder()` to always create character icon mappings
  - Updated `buildIdMapsFromRaw()` to preserve existing mappings
  - Enhanced character ID lookup logic in rendering function
  - Fixed image path construction in character display code
  - Added comprehensive character icon mapping (lines 547-583)

### Character Icon Mappings Added
Complete mapping for characters including:
- Numeric character IDs (1102-1608 range)
- Special string key "zaira" for main character
- Direct filename associations to WebP icon files

### Testing
- **Verified functionality**: Character portraits now display correctly when uploading `characters_wuwainventorykamera.json`
- **Local server compatibility**: Confirmed proper operation with Python HTTP server on localhost:8080
- **Cross-character support**: Tested with multiple character types including special "zaira" character
- **Console debugging**: Added extensive logging for troubleshooting future issues