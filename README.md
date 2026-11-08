# Decky Nutstore

A [Decky](https://github.com/SteamDeckHomebrew/decky-loader) plugin that syncs your Steam Deck game saves to the cloud using [rclone](https://rclone.org/). This build is configured for **Nutstore (坚果云) WebDAV** only — a cloud service that works reliably from within China without a VPN.

Support: open an issue on this repository, or join the [SteamDeckHomebrew Discord](https://deckbrew.xyz/discord).

## Troubleshooting

If a sync fails, the logs will usually tell you everything you need. You can find them inside the plugin panel, or at `~/homebrew/logs/decky-nutstore/`. You may be asked to provide them when asking for help.

To see more detailed logs, change `log_level` in `~/homebrew/settings/decky-nutstore/plugin.properties` to `DEBUG`. Remember to change it back to `INFO` (or higher) when you are done.

## Features

* Back up game saves (or any files/folders) to Nutstore (坚果云) WebDAV.
* Automatic backup after a game is closed.
* File counter that estimates how many files a sync path would pick up — prevents accidentally backing up the entire Steam Deck.
* Advanced filtering with includes and excludes.
* Optional destination subfolder on Nutstore.
* Automatic sync on game startup/exit (download on launch, upload on exit).
* Easy access to sync logs from the plugin panel.

**NOTE!** This plugin **does not** delete files from the cloud even if they are deleted locally (in regular copy mode). This is intentional, to protect against accidents.

## Installation

Download the latest release from the [releases page](https://github.com/jmac1990cn/decky-nutstore/releases/) and install it via the built-in Decky installer (`Decky` → `Settings` → `Developer` → `Install Plugin from ZIP`). Or clone / download this repository and install the extracted folder the same way.

## Usage

### Authentication (Nutstore / 坚果云)

To sync files you must first configure Nutstore WebDAV as the cloud backend.

Navigate to `Configuration → Cloud Provider` and click the **Nutstore (WebDAV)** button. A window opens where you enter:

- **WebDAV URL**: `https://dav.jianguoyun.com/dav/` (pre-filled, usually no need to change)
- **Nutstore account (email)**
- **App-specific password** (NOT your login password — generate one at Nutstore web → Security → Third-party app authorization)

After clicking OK the plugin writes the rclone config automatically, and `Currently using: Nutstore WebDAV` appears at the top.

If Big Picture input is inconvenient, a desktop-mode fallback script is provided at `defaults/quickstart/nutstore_webdav.sh` (run `bash ./defaults/quickstart/nutstore_webdav.sh` from the plugin install directory).

### Paths

The second step is to choose what to sync.

Navigate to `Configuration → Sync Paths` and click **Add to Sync**. You can sync individual files or folders. After selecting a path, an estimate of the number of files to be synced is shown. If the count is greater than 9000, be cautious — you may have selected the wrong path (a game's save files are usually fewer than 10).

**IMPORTANT!** The plugin follows symlinks inside sync paths. If a symlink is created, its target also gets backed up. This shows up in the estimated file count.

**Flat layout on Nutstore.** Each selected folder is uploaded to the Nutstore root using its own folder name (e.g. `The Elder Scrolls V Skyrim` → `坚果云根目录/The Elder Scrolls V Skyrim`). The plugin remembers each folder's Steam Deck path, so a reverse sync restores the data to exactly the same location. The `坚果云存放目录` field is an *optional* subfolder — **leave it empty to upload straight to the Nutstore root** (recommended for easy access on a PC).

**Two sync directions.** The sync section has two separate buttons instead of a single sync:

- **SD → 云端（上传存档）** — copies your Steam Deck saves *to* Nutstore (`rclone copy` local → cloud). Use this after playing, or any time you want to push local changes to the cloud.
- **云端 → SD（下载存档）** — copies from Nutstore *back to* your Steam Deck (`rclone copy` cloud → local), restoring each folder to its remembered path. If a folder was never uploaded, it is skipped automatically.

Automatic sync on game start/stop follows the same logic: on launch it **downloads** the latest cloud saves before you play; on exit it **uploads** your local saves.

> Security: rclone stores the WebDAV password obfuscated (not strongly encrypted) on the Steam Deck filesystem. Use a dedicated Nutstore app-specific password rather than your main account password.

## 简体中文界面

The plugin ships with a translation system that follows Steam's language setting. Simplified Chinese (`schinese`) and Traditional Chinese (`tchinese`) are mapped to the correct translation files; just set Steam's language to 简体中文 and the UI shows Simplified Chinese. Translations live in `assets/languages/zh-CN.json` (Simplified) and `zh.json` (Traditional).

## Usage (Advanced)

This build only supports Nutstore (坚果云) WebDAV. To configure it manually in desktop mode, run `bash ./defaults/quickstart/nutstore_webdav.sh` from the plugin install directory and follow the interactive prompts (WebDAV URL, Nutstore email, app-specific password). The script creates an rclone remote named `backend`, which is what the plugin uses for all sync operations.

<u>**SECURITY WARNING: rclone saves the WebDAV password obfuscated (not strongly encrypted) on the Steam Deck filesystem**</u>. Use a dedicated Nutstore app-specific password rather than your main account password.

### Advanced configuration (`plugin.properties`)

The file `~/homebrew/settings/decky-nutstore/plugin.properties` holds a few tunables:

- `log_level` — set to `DEBUG` for verbose logs (default `INFO`).
- `destination_directory` — an optional Nutstore subfolder. Leave empty to sync to the Nutstore root.
- `additional_sync_args` — extra arguments passed to every rclone copy (e.g. provider-specific flags).
- `sync_root` — the absolute path prefix sync paths must live under (default `/`). Must be absolute and end with `/`.

### Custom sync root

By default the sync root is `/` for simplicity. If that causes issues, you can change it to another absolute path (ending in `/`) and symlink folders into it. Any previously defined paths must be adjusted accordingly.

## Building from source

```bash
pnpm install
pnpm build        # outputs dist/
```

Then install the plugin folder (which contains `dist/`, `bin/`, `py_modules/`, `main.py`, `plugin.json`, …) via the Decky developer installer. The `bin/rclone` binary and `bin/rcloneLauncher` script are bundled so the plugin works out of the box.

To rebuild the bundled rclone engine (optional), see `backend/Dockerfile` and `backend/entrypoint.sh`.

## Acknowledgments

* [rclone](https://rclone.org/) — the sync engine that makes this plugin possible.
* [SteamDeckHomebrew](https://github.com/SteamDeckHomebrew) — Decky loader and development assistance.
* This plugin is a Nutstore-focused fork of [decky-cloud-save](https://github.com/GedasFX/decky-cloud-save) by GedasFX.
