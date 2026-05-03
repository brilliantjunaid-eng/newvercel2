# Pact

A curiosity-first study companion designed around the hardest part of studying: the first few minutes.

## Project Structure

- `index.html` - main app shell
- `styles.css` - visual system and layout
- `script.js` - app logic, routing, session flow, local storage
- `assets/pact-mark.svg` - brand mark / favicon
- `login.html`, `app.html`, `hook.html`, `session.html` - redirect helpers for cleaner direct links
- `404.html` - fallback redirect for static hosting

## Open In VS Code

1. Open VS Code
2. Choose `File` -> `Open Folder`
3. Open this folder: `pact-site`
4. Open `index.html`

If you use the Live Server extension, start it from `index.html`.

## Publish On GitHub Pages

1. Create a new GitHub repository
2. Upload every file in this folder
3. In GitHub, open `Settings` -> `Pages`
4. Under `Build and deployment`, choose:
   - `Source`: `Deploy from a branch`
   - `Branch`: `main` (or `master`)
   - `Folder`: `/ (root)`
5. Save
6. GitHub will give you a public site URL

## Notes

- This app uses browser `localStorage`
- That means each person using the site sees their own local name, sessions, and streak on their own device
- There is no shared account system yet
