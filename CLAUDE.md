# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based image evaluation platform built with vanilla HTML, CSS, and JavaScript. The application fetches images from Google Drive via an n8n webhook and presents them in a Tinder-style swipeable interface for approval/disapproval.

## Architecture

### Core Components

1. **Single Page Application Structure**
   - `index.html` - Main HTML structure
   - `styles.css` - All styling including card stacking and animations
   - `script.js` - Application logic and state management

2. **URL-based Folder ID Extraction**
   - Application extracts Google Drive folder ID from URL path: `http://[domain]/{google_drive_folder_id}`
   - Uses `window.location.pathname` to parse the folder ID

3. **API Integration**
   - Primary webhook: `https://n8n.jacopogomarasca.it/webhook-test/7c46aa4d-1163-49f2-85f3-0e4c3dcc74f0`
   - POST request with `{"folderId": "extracted_id"}` body
   - Response contains `assets` array and `resumeUrl` for future submission

4. **State Management**
   - Array of image objects with `id` and `status` ('undecided', 'approved', 'not approved')
   - Current image index tracking
   - History stack for undo functionality

### Critical Implementation Details

**iframe Display Requirements:**
- Use `embedUrl` from API response for reliable image display
- Apply `pointer-events: none;` to iframe elements to enable parent div interactions
- Style iframe as `width: 100%; height: 100%;` within parent card

**Card Stacking System:**
- Visual z-index stacking with only top card interactive
- CSS transforms for swipe animations
- Card removal animations when swiped off-screen

**Input Methods:**
- Mouse drag gestures (left = disapprove, right = approve)
- Keyboard controls (ArrowLeft = disapprove, ArrowRight = approve, Backspace = undo)
- On-screen action buttons

## Development Workflow

Since this is a vanilla web project with no build system:

1. **Development**: Open `index.html` directly in browser or use a simple HTTP server
2. **Testing**: Manual testing in browser, no automated test framework
3. **Debugging**: Use browser dev tools, console.log for state inspection

## Key Technical Constraints

- **No external frameworks** - Pure HTML, CSS, JavaScript only
- **Cross-origin considerations** - Google Drive embeds may have CORS restrictions
- **Mobile responsiveness** - Touch gestures should work on mobile devices
- **Browser compatibility** - Modern ES6+ features are acceptable

## Project Phases

**Phase 1 (Current)**: Frontend implementation up to review completion
- Image fetching and display
- Swipe/keyboard interactions
- Undo functionality
- Review completion screen (Submit button logs data only)

**Phase 2 (Future)**: Submission logic implementation
- Actual API call to `resumeUrl` with review results
- Error handling and retry logic

## API Data Structures

**Request to n8n webhook:**
```json
{
  "folderId": "google_drive_folder_id"
}
```

**Expected response:**
```json
{
  "assets": [
    {
      "id": "1-AbcDEfG...",
      "thumbUrl": "https://...",
      "embedUrl": "https://drive.google.com/file/d/1-AbcDEfG.../preview"
    }
  ],
  "total": 50,
  "resumeUrl": "https://n8n.jacopogomarasca.it/webhook/..."
}
```

## File Organization

Keep the project structure simple:
- `index.html` - Main application entry point
- `styles.css` - All CSS including responsive design and animations
- `script.js` - Application logic, API calls, and event handlers
- Optional: `assets/` folder for any local images or icons