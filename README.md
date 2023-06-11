<p align="center">
  <a href="https://dearrow.ajay.app"><img src="public/icons/logo-128.png" alt="Logo"></img></a>
</p>

<h1 align="center">DeArrow</h1>

DeArrow is a browser extension for crowdsourcing better titles and thumbnails on YouTube.

The goal of DeArrow is to make titles accurate and reduce sensationalism.

Titles can be any arbitrary text. Thumbnails are screenshots from specific timestamps in the video. These are user submitted and voted on.

By default, if there are no submissions, it will format the original title to the user-specified format, and set a screenshot from a random timestamp as the thumbnail. This can be configured in the options to disable formatting, or show the original thumbnail by default.

If the original thumbnail is actually good, you can still vote for it in the submission menu, and then it will act like a submission.

The extension is currently in beta, and there are some issues to work out, but it should be fully usable.

![](https://cdn.fosstodon.org/media_attachments/files/110/520/916/244/905/970/original/9908f444b4e78a31.png)
![](https://cdn.fosstodon.org/media_attachments/files/110/520/917/557/536/945/original/b65eadd7ea18e073.png)

### How it works

The browser extension first fetches data from the [backend](https://github.com/ajayyy/SponsorBlockServer) about submitted titles and thumbnails. If one is found, it replaces the branding locally.

All thumbnails are just timestamps in a video, so they need to be generated. There are two options to generate them. One is to use the [thumbnail generation service](https://github.com/ajayyy/DeArrowThumbnailCache), and another is to generate it locally. It tries both and uses the fastest one. The thumbnail generation service will cache thumbnails for future requests, making it return instantly for the next user. Local thumbnail generation is done by taking a screenshot of an HTML video element using and drawing that to a canvas.

If no thumbnails or titles are submitted, it switches to the configurable fallback options. Titles will be formatted according to user preference (title or sentence cases). Thumbnails, by default, are generated at a random timestamp that is not in a [SponsorBlock](https://github.com/ajayyy/SponsorBlock) segment.

Lastly, it adds a "show original" button if anything was changed, allowing you to peek at the original title and thumbnail when you want.

### Download

[Firefox](https://addons.mozilla.org/en-US/firefox/addon/dearrow/)
[Chromium](https://chrome.google.com/webstore/detail/dearrow-better-titles-and/enamippconapkdmgfgjchkhakpfinmaj)


### Related Repositories

| Name | URL |
| --- | --- |
| Extension | https://github.com/ajayyy/DeArrow |
| Shared Library With SponsorBlock | https://github.com/ajayyy/maze-utils |
| Translations | https://github.com/ajayyy/ExtensionTranslations |
| Backend | https://github.com/ajayyy/SponsorBlockServer|
| Backend Kubernetes Manifests | https://github.com/ajayyy/SponsorBlockKubernetes |
| Thumbnail Cache Backend | https://github.com/ajayyy/DeArrowThumbnailCache |
| Thumbnail Cache Kubernetes Manifests | https://github.com/ajayyy/k8s-thumbnail-cache |

### Building

You must have [Node.js 16](https://nodejs.org/) and npm installed.

1. Clone with submodules

```bash
git clone https://github.com/ajayyy/DeArrow --recurse-submodules=yes
```

Or if you already cloned it, pull submodules with

```bash
git submodule update --init --recursive
```

2. Copy the file `config.json.example` to `config.json` and adjust configuration as desired.

    - You will need to repeat this step in the future if you get build errors related to `CompileConfig`.

3. Run `npm install` in the repository to install dependencies.

4. Run `npm run build:dev` (for Chrome) or `npm run build:dev:firefox` (for Firefox) to generate a development version of the extension with source maps.

    - You can also run `npm run build` (for Chrome) or `npm run build:firefox` (for Firefox) to generate a production build.

5. The built extension is now in `dist/`. You can load this folder directly in Chrome as an [unpacked extension](https://developer.chrome.com/docs/extensions/mv3/getstarted/#manifest), or convert it to a zip file to load it as a [temporary extension](https://developer.mozilla.org/en-US/docs/Tools/about:debugging#loading_a_temporary_extension) in Firefox.

### Credit

Built on the base of [SponsorBlock](https://github.com/ajayyy/SponsorBlock) licensed under LGPL 3.0.

Logo based on Twemoji licensed under CC-BY 4.0.
