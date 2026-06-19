OnBase.spray.com Website

Quick ways to open or publish this static site:

Open locally
- Double-click `index.html` in your file browser to open in a browser (works for basic viewing).
- Or run a simple HTTP server from the project folder for better behavior:

```bash
# Python 3
python -m http.server 8000
# then open http://localhost:8000
```

Publish to GitHub Pages
1. Create a new repository on GitHub and push this project to it.
2. Enable Pages in the repository settings and set the source to the `gh-pages` branch.

Custom domain support
- This repo includes a `CNAME` file preconfigured for `OnBase.spray.com`.
- To make the domain live:
  1. Push this repo to GitHub and enable Pages using the `gh-pages` branch.
  2. In your domain registrar, point `OnBase.spray.com` to GitHub Pages using either:
     - A records to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`, or
     - A CNAME record to `YOUR_GITHUB_USERNAME.github.io`.
  3. Set `OnBase.spray.com` as the custom domain in GitHub Pages settings.

Automated deploy with GitHub Actions (included)
- This repo includes an Actions workflow that will publish the repo root to the `gh-pages` branch when you push to `main`.
- After the first successful push, confirm the Pages URL and custom domain in GitHub repository settings.

Other options
- Drag-and-drop the site folder into Netlify (or similar) to host quickly.

Notes
- The page previously linked to `OnBase.spray.com` which currently shows a parked page. To make the domain serve this site, update DNS and hosting at your domain registrar or DNS provider.
