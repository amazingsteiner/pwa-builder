# Learnly PWA

This is a browser/PWA conversion of the uploaded Learnly_AllGrades-5 project.

## Included
- Installable PWA shell
- Responsive mobile-first UI
- Learn / Practice / Papers / Progress / Profile
- Grade R–9 curriculum selector from the project's `curriculum_all_grades.json`
- Reuses the original local content JSON files
- Local profile and progress storage
- Service worker for offline caching after first load
- Print / Save PDF paper workflow

## Run
A PWA cannot reliably load local JSON through `file://`. Serve this folder with a local HTTP server, for example:

`python -m http.server 8000`

Then open `http://localhost:8000/`.

For Android, the same folder can be hosted by a local server app or deployed to any static web host. The app itself does not require a backend for the included learning/progress features.

## Important
The original project contains PySide6 desktop code. This PWA is a web implementation of the user-facing learning core; PySide6 cannot run directly in a browser. Existing JSON content is reused rather than silently replaced.
