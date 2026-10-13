# Deploying the new MIRAGE website

This folder is laid out exactly like the GitHub repo
(`MirageDeception/Mirage-website`, local copy `~/Desktop/Project-Mirage-website`) should look after the switch.

```
.github/workflows/deploy.yml   publishes site/ to GitHub Pages on every push to main (no build step)
.gitignore                     keeps .env and system files out of git
site/                          the website itself
  index.html  blog.html  team.html
  css/   js/   img/            (img/ includes the favicon, home-screen icon and link-preview image)
```

The site is plain HTML/CSS/JS. All its links are relative, so it works at
`https://miragedeception.github.io/Mirage-website/` with no path changes.

## Steps

All commands are run in your live repo.

```bash
cd ~/Desktop/Project-Mirage-website
git checkout -b redesign-v2
```

1. **Remove the `.env` file.** It is committed to the public repo. It only holds a Google sign-in
   client ID used by the old site. That's not a secret, but nothing uses it any more.
   If you also want to retire that ID, delete the OAuth client in Google Cloud Console.

```bash
git rm .env
```

2. **Remove the old React app.** It stays in git history if you ever need it.

```bash
git rm -r src public index.html package.json package-lock.json vite.config.ts eslint.config.js tsconfig.json tsconfig.app.json tsconfig.node.json tsconfig.app.tsbuildinfo tsconfig.node.tsbuildinfo
```

3. **Copy in the new site, workflow and .gitignore.**

```bash
cp -R ~/Desktop/Mirage-website-deploy/site .
cp ~/Desktop/Mirage-website-deploy/.github/workflows/deploy.yml .github/workflows/deploy.yml
cp ~/Desktop/Mirage-website-deploy/.gitignore .gitignore
```

4. **Decide on `Project docs/`** (MVP implementation and architecture notes). It is public today.
   If it's internal, remove it with `git rm -r "Project docs"` and keep it in a private repo.
   Its old versions stay in git history.

5. **Check locally before pushing.** This serves the site at the same `/Mirage-website/` address
   GitHub uses. Open http://localhost:8000/Mirage-website/ and stop the server with Ctrl+C when done.

```bash
mkdir -p /tmp/pages && ln -sfn "$PWD/site" /tmp/pages/Mirage-website && python3 -m http.server 8000 -d /tmp/pages
```

6. **Commit and push.** Merge the branch to `main` (directly or via a pull request). The push to `main`
   runs the workflow and publishes the site within a minute or two; follow it in the repo's
   **Actions** tab.

```bash
git add -A
git status
git commit -m "New MIRAGE website"
git push -u origin redesign-v2
```

7. **GitHub settings** (only if the site doesn't update): in the repo go to **Settings → Pages** and make sure
   **Source** is set to **GitHub Actions**. It already is for the current site.

## After going live
- Share a link on LinkedIn or WhatsApp to see the new preview card (logo, tagline).
  LinkedIn caches previews; use https://www.linkedin.com/post-inspector/ to refresh it.
- `?game=off` and `?wheel=off` at the end of the address hide the game and the wheel, if ever needed.

## Updating the site later
Edit the design in `~/Desktop/Project-Mirage-website-redesign/docs/concept/`, then rebuild this folder:

```bash
python3 ~/Desktop/Project-Mirage-website-redesign/docs/build-deploy.py
```

Copy `site/` into the repo again, then commit and push.
