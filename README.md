<p align="center">
  <a href="https://dearrow.ajay.app"><img src="public/icons/logo-128.png" alt="Logo"></img></a>
</p>

<h1 align="center">DeArrow</h1>

> EXPERIMENTAL PROTOTYPE PLEASE WAIT FOR STABLE. If you do like testing alpha software, please join #de-arrow channel on Discord/Matrix and follow the instructions.

DeArrow is a browser extension for crowdsourcing better titles and thumbnails on YouTube.

### Related Repositories

| Name | URL |
| --- | --- |
| Extension | https://github.com/ajayyy/DeArrow |
| Shared Library With SponsorBlock | https://github.com/ajayyy/maze-utils |
| Translations | https://github.com/ajayyy/ExtensionTranslations |
| Backend | https://github.com/ajayyy/SponsorBlockServer |
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