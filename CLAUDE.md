# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a "Tinder-style" image evaluation frontend application built with vanilla HTML, CSS, and JavaScript. The app allows users to swipe through images from Google Drive folders to approve or disapprove them, with results submitted back to an n8n workflow.

## Core Architecture

### The Golden Rule
**NEVER use Google Drive iframe embeds.** The entire image loading strategy is built around the direct Google Drive Thumbnail API:
- URL Format: `https://drive.google.com/thumbnail?id={fileId}&sz=w{size}`
- Low-res placeholder: `sz=w400`
- High-res final: `sz=w1200`

### Progressive Loading Strategy
The app implements a 3-step progressive loading process for optimal performance:
1. **Create card + show spinner** with low-res background image
2. **Load high-res in background** using JavaScript Image object
3. **Display high-res when loaded** with smooth transition

### File Structure
- `index.html` - Single-page app structure with multiple screens
- `styles.css` - Mobile-first responsive design with card stack animations
- `script.js` - ES6 class-based application (`ImageReviewer` class)

## API Integration

### n8n Webhook Contract
- **Initial endpoint**: `https://n8n.jacopogomarasca.it/webhook/7c46aa4d-1163-49f2-85f3-0e4c3dcc74f0`
- **Request**: `POST { "folderId": "..." }`
- **Response**: `{ "assets": [{"id": "..."}, ...], "resumeUrl": "..." }`
- **Submission**: `POST` to `resumeUrl` with array of disapproved images only

### Data Flow
1. User clicks "Get Images" → POST to initial webhook with folder ID
2. App receives list of image IDs and resume URL
3. Progressive loading of images using Google Drive Thumbnail API
4. User swipes/clicks to approve/disapprove images
5. Final submission sends only disapproved images to resume URL

## Key Features

### Interaction Methods
- **Touch/Mouse swiping**: Left = disapprove, Right = approve
- **Button controls**: On-screen approve/disapprove/undo buttons
- **Keyboard shortcuts**: Arrow keys + Backspace for undo

### State Management
- `images` array tracks all images with status ('approved', 'not approved', 'undecided')
- `reviewHistory` array enables undo functionality
- Rolling buffer maintains 3 cards in DOM for smooth experience

### Mobile Optimization
- Touch-friendly swipe gestures with momentum detection
- Responsive design with mobile-first approach
- Landscape orientation support
- Performance optimized for mobile devices

## Development Notes

### Testing
Open `index.html` in a browser. For development, a mock folder ID is used if none provided in URL parameters (`?folderId=...`).

### Image Loading Error Handling
If Google Drive image fails to load (permissions, deleted file, etc.), the app displays "Image could not be loaded" and continues without crashing.

### Performance Considerations
- Only 3 images loaded in DOM at any time
- Proactive preloading of next images as user progresses
- CSS transitions for smooth animations
- Background image caching strategy