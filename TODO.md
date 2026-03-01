# TODO - Reorganize Create Auction UI

## Task

Reorganize the UI for creating Live Auction to fix the shaky 3D cards issue and make it more professional and stable.

## Plan

- [x] Read and analyze the current create.hbs file
- [ ] Create reorganized UI with:
  - Remove 3D card transforms (cause of shaking)
  - Remove particle animations
  - Remove excessive glow/pulse animations
  - Keep step progress indicator (clean version)
  - Maintain all form fields and functionality
  - Add cleaner, professional styling
- [ ] Test the UI

## Changes to Make

1. Remove `.card-3d` class and related transforms
2. Remove `.particle` animations
3. Remove `glow-effect` and related animations
4. Remove `animate-float` background animations
5. Keep essential animations (fade-in, slide-up) but make them subtle
6. Clean up the overall layout structure
