import asyncio
from asyncio.subprocess import create_subprocess_exec
import os
import re
import zlib
from pathlib import Path
import decky_plugin
import plugin_config

class RcloneSetupManager:
    async def setup_webdav(self, url: str, user: str, password: str):
        """
        Configures a WebDAV backend (e.g. Nutstore / 坚果云) for cloud saves.

        WebDAV does not use an interactive OAuth flow, so the credentials are
        supplied directly and written into the rclone remote named 'backend'.

        Parameters:
        url (str): The WebDAV endpoint (e.g. https://dav.jianguoyun.com/dav/).
        user (str): The WebDAV username (Nutstore account email).
        password (str): The WebDAV password (Nutstore app-specific password).

        Returns:
        str: The backend type ('webdav') on success.
        """
        decky_plugin.logger.info("Configuring WebDAV backend (url=%s, user=%s)", url, user)

        # The rclone binary + launcher must be present in the plugin's bin/ folder.
        # If they are missing (e.g. the plugin was installed without a proper build),
        # give a clear error instead of a cryptic "[Errno 2] No such file or directory".
        if not os.path.exists(plugin_config.rclone_bin):
            decky_plugin.logger.error("rclone launcher missing at %s", plugin_config.rclone_bin)
            raise Exception("RCLONE_MISSING")

        # Remove any existing 'backend' remote first, otherwise
        # 'rclone config create' fails with "remote already exists".
        delete_proc = await create_subprocess_exec(
            plugin_config.rclone_bin, "config", "delete", "backend")
        await delete_proc.communicate()

        proc = await create_subprocess_exec(
            plugin_config.rclone_bin, "config", "create", "backend", "webdav",
            f"url={url}", "vendor=other", f"user={user}", f"pass={password}",
            stderr=asyncio.subprocess.PIPE)
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            decky_plugin.logger.error("WebDAV config failed: %s", stderr.decode())
            raise Exception("WEBDAV_CONFIG_FAILED")

        decky_plugin.logger.info("WebDAV backend configured successfully")
        return "webdav"

    async def get_backend_type(self):
        """
        Retrieves the current backend type from the rclone configuration.

        Returns:
        str: The current backend type.
        """
        with open(plugin_config.rclone_cfg, "r") as f:
            l = f.readlines()
            return l[1]

    async def get_syncpaths(self, file: str):
        """
        Retrieves sync paths from the specified file.

        Parameters:
        file (str): The file from which to retrieve sync paths.

        Returns:
        list: A list of sync paths.
        """
        file = plugin_config.cfg_syncpath_excludes_file if file == "excludes" else plugin_config.cfg_syncpath_includes_file
        with open(file, "r") as f:
            return f.readlines()

    async def test_syncpath(self, path: str):
        """
        Tests a sync path to determine if it's a file or a directory.

        Parameters:
        path (str): The path to test.

        Returns:
        int | str: The number of files if it's a directory, '9000+' if it exceeds the limit, or 0 if it's a file.
        """
        if not path.startswith(plugin_config.get_config_item("sync_root", "/")):
            raise Exception("Selection is outside of sync root.")

        if path.endswith("/**"):
            scan_single_dir = False
            path = path[:-3]
        elif path.endswith("/*"):
            scan_single_dir = True
            path = path[:-2]
        else:
            return int(Path(path).is_file())

        count = 0
        for root, os_dirs, os_files in os.walk(path, followlinks=True):
            decky_plugin.logger.debug("%s %s %s", root, os_dirs, os_files)
            count += len(os_files)
            if count > 9000:
                return "9000+"
            if scan_single_dir:
                break

        return count

    async def add_syncpath(self, path: str, file: str):
        """
        Adds a sync path to the specified file.

        Parameters:
        path (str): The path to add.
        file (str): The file to add the path to.
        """
        decky_plugin.logger.info("Adding Path to Sync: '%s', %s", path, file)

        # Replace the beginning of path to replace the root.
        path = path.replace(plugin_config.get_config_item("sync_root", "/"), "/", 1)

        file = plugin_config.cfg_syncpath_excludes_file if file == "excludes" else plugin_config.cfg_syncpath_includes_file

        with open(file, "r") as f:
            lines = f.readlines()
        for line in lines:
            if line.strip("\n") == path:
                return
        lines += [f"{path}\n"]
        with open(file, "w") as f:
            for line in lines:
                f.write(line)

        plugin_config.regenerate_filter_file()

    async def remove_syncpath(self, path: str, file: str):
        """
        Removes a sync path from the specified file.

        Parameters:
        path (str): The path to remove.
        file (str): The file to remove the path from.
        """
        decky_plugin.logger.info("Removing Path from Sync: '%s', %s", path, file)

        file = plugin_config.cfg_syncpath_excludes_file if file == "excludes" else plugin_config.cfg_syncpath_includes_file
        with open(file, "r") as f:
            lines = f.readlines()
        with open(file, "w") as f:
            for line in lines:
                if line.strip("\n") != path:
                    f.write(line)

        plugin_config.regenerate_filter_file()

    async def list_steam_compatdata(self):
        """
        Lists Proton compatdata prefixes with their resolved game names.

        Scans every Steam library's ``steamapps/compatdata`` directory, keeps the
        numeric folders (each is an appid / Proton prefix) and resolves the human
        readable game name from the matching ``appmanifest_<appid>.acf`` file.
        This mirrors the way protontricks enumerates installed games.

        Non-Steam shortcuts have no ``appmanifest``; their names are resolved
        from ``steamapps/shortcuts.vdf`` instead.

        Returns:
        list: A list of dicts ``{"appid": str, "name": str, "path": str}`` sorted
              by game name (case-insensitive).
        """
        games = []
        shortcut_map: dict = {}
        for steamapps in self._steam_steamapps_dirs():
            # Non-Steam games live only in shortcuts.vdf. Steam stores the
            # per-user shortcuts under userdata/<steamid>/config/shortcuts.vdf,
            # but some setups also keep a copy at steamapps/shortcuts.vdf, so we
            # check both.
            for vdf in self._shortcut_vdf_paths(steamapps):
                shortcut_map.update(self._parse_shortcuts_vdf(vdf))

            compatdata = steamapps / "compatdata"
            if not compatdata.is_dir():
                continue
            for entry in compatdata.iterdir():
                if not entry.is_dir() or not entry.name.isdigit():
                    continue
                appid = entry.name
                name = self._resolve_app_name(steamapps, appid) or shortcut_map.get(appid) or appid
                games.append({"appid": appid, "name": name, "path": str(entry)})

        # De-duplicate by appid (a game could appear in multiple libraries) and
        # sort by name so the list reads like protontricks' game picker.
        seen = set()
        unique = []
        for g in games:
            if g["appid"] in seen:
                continue
            seen.add(g["appid"])
            unique.append(g)
        unique.sort(key=lambda g: g["name"].lower())
        return unique

    async def list_directory(self, path: str):
        """
        Lists the contents of a directory for the in-plugin folder browser.

        Parameters:
        path (str): The absolute directory to list.

        Returns:
        list: A list of dicts ``{"name": str, "path": str, "is_dir": bool}`` with
              directories first, then files, each sorted by name (case-insensitive).
        """
        p = Path(path)
        if not p.is_dir():
            raise Exception("Path is not a directory: " + path)
        decky_plugin.logger.debug("Listing directory: %s", path)
        entries = []
        for entry in p.iterdir():
            entries.append({"name": entry.name, "path": str(entry), "is_dir": entry.is_dir()})
        entries.sort(key=lambda e: (not e["is_dir"], e["name"].lower()))
        return entries

    # ------------------------------------------------------------------ #
    # Save-directory detection (modelled on Game Launcher's savedir.js)
    # ------------------------------------------------------------------ #

    @staticmethod
    def _name_variants(name: str):
        """Return likely folder-name variants for a game name.

        Mirrors Game Launcher's ``nameVariants``: the raw name plus common
        transformations (strip illegal/title characters, drop subtitle after
        ``:``/``-``, remove spaces, swap spaces for underscores). Short (<2
        char) and duplicate variants are dropped.
        """
        raw = [name or ""]
        out = []
        seen = set()

        def add(value):
            value = str(value or "").strip()
            if len(value) >= 2 and value not in seen:
                seen.add(value)
                out.append(value)

        for item in raw:
            s = str(item or "").strip()
            if not s:
                continue
            add(s)
            # Remove characters illegal in Windows folder names + punctuation.
            add(re.sub(r'[:：\\/:*?"<>|]，,。！!', "", s).strip())
            # Drop subtitle after ':' / '-' / en-dash / em-dash ("Only Wolves" etc.)
            add(re.split(r"[:：\-–—]", s)[0].strip())
            # Remove all whitespace, and replace whitespace with underscore.
            add(re.sub(r"\s+", "", s))
            add(re.sub(r"\s+", "_", s))
        return out[:24]

    @staticmethod
    def _describe_dir(directory: Path):
        """Shallow info for a directory: entry count + newest mtime (ms)."""
        entries = 0
        last = 0.0
        try:
            listing = list(directory.iterdir())
            entries = len(listing)
            for child in listing[:40]:
                try:
                    m = child.stat().st_mtime
                    if m > last:
                        last = m
                except Exception:
                    pass
        except Exception:
            pass
        return entries, (int(last * 1000) if last else None)

    async def detect_save_dirs(self, appid: str, name: str, prefix_path: str):
        """Detect likely save folders *only* inside the selected game's prefix.

        On Steam Deck a Windows game's saves live under its Proton prefix at
        ``compatdata/<appid>/pfx/drive_c/users/steamuser/``. We do NOT scan
        Steam cloud, the Linux home, or other game prefixes — results are
        restricted to this one game's prefix so nothing unrelated is offered.

        Inside that user folder we look in the usual Windows save locations
        (Documents, Documents/My Games, Saved Games, AppData/{Roaming,Local,
        LocalLow}) combined with variants of the game name, plus generic save
        sub-folders (save, saves, SaveData…) and name-named folders directly
        under the user folder.

        Only directories that actually exist are returned. Each result carries
        a ``source`` (for UI grouping), ``exists``, ``entries`` (file count) and
        ``lastModified`` (ms), sorted by source priority then newest-first.
        """
        results = []
        seen = set()
        source_order = {
            "proton_user": 0,
            "generic": 1,
            "user_root": 2,
        }
        name_variants = self._name_variants(name)

        def push(path: Path, source: str):
            if not path:
                return
            try:
                norm = str(path)
            except Exception:
                return
            key = norm.lower().rstrip("/")
            if not key or key in seen:
                return
            if not path.is_dir():
                return
            seen.add(key)
            entries, last = self._describe_dir(path)
            results.append({
                "path": norm,
                "source": source,
                "exists": True,
                "entries": entries,
                "lastModified": last,
            })

        if not prefix_path:
            return results

        prefix = Path(prefix_path)
        users_root = prefix / "pfx" / "drive_c" / "users"

        # Steam Deck's Proton prefix uses "steamuser"; prefer it, but fall back
        # to any user folder present (some prefixes keep a different name).
        user_dirs: list = []
        steamuser = users_root / "steamuser"
        if steamuser.is_dir():
            user_dirs.append(steamuser)
        if users_root.is_dir():
            try:
                for u in users_root.iterdir():
                    if u.is_dir() and u != steamuser:
                        user_dirs.append(u)
            except Exception:
                pass

        # Windows-style save locations, combined with game-name variants.
        proton_subdirs = [
            "Documents",
            os.path.join("Documents", "My Games"),
            "Saved Games",
            os.path.join("AppData", "Roaming"),
            os.path.join("AppData", "Local"),
            os.path.join("AppData", "LocalLow"),
        ]
        for user_dir in user_dirs:
            for sub in proton_subdirs:
                base = user_dir / sub
                for variant in name_variants:
                    push(base / variant, "proton_user")

        # Generic save folder names and game-named folders, directly under the
        # user folder (covers games that write straight into the profile root).
        generic_names = (
            "save", "saves", "SaveData", "SaveGames", "savegame",
            "saved", "Saved Games", "Profile", "profiles",
        )
        for user_dir in user_dirs:
            for sub in generic_names:
                push(user_dir / sub, "generic")
            for variant in name_variants:
                push(user_dir / variant, "user_root")

        results.sort(key=lambda r: (
            source_order.get(r["source"], 9),
            -(r["lastModified"] or 0),
        ))
        return results[:16]

    def _steam_steamapps_dirs(self):
        """
        Returns every known Steam ``steamapps`` directory (native + Flatpak),
        de-duplicated by real path so a symlinked native/Flatpak setup does not
        scan the same ``compatdata`` twice.
        """
        home = Path.home()
        candidates = [
            # Native Steam install (SteamOS default on Deck).
            home / ".local" / "share" / "Steam" / "steamapps",
            home / ".steam" / "steam" / "steamapps",
            # Flatpak Steam.
            home / ".var" / "app" / "com.valvesoftware.Steam" / ".steam" / "steam" / "steamapps",
            home / ".var" / "app" / "com.valvesoftware.Steam" / ".local" / "share" / "Steam" / "steamapps",
        ]
        seen = set()
        result = []
        for p in candidates:
            if not p.is_dir():
                continue
            try:
                rp = str(p.resolve())
            except Exception:
                rp = str(p)
            if rp in seen:
                continue
            seen.add(rp)
            result.append(p)
        return result

    def _shortcut_vdf_paths(self, steamapps: Path):
        """
        Yields every ``shortcuts.vdf`` that could describe non-Steam games.

        Steam keeps per-user shortcuts in
        ``<steam>/userdata/<steamid>/config/shortcuts.vdf``; older / some setups
        also store one at ``steamapps/shortcuts.vdf``. We return all that exist.
        """
        found = []
        steam_root = steamapps.parent
        # Per-user shortcuts (the real home of non-Steam games).
        userdata = steam_root / "userdata"
        if userdata.is_dir():
            for sid in userdata.iterdir():
                if not sid.is_dir() or not sid.name.isdigit():
                    continue
                vdf = sid / "config" / "shortcuts.vdf"
                if vdf.is_file():
                    found.append(vdf)
        # Fallback copies: next to steamapps, or directly under the steam root.
        for vdf in (steamapps / "shortcuts.vdf", steam_root / "shortcuts.vdf"):
            if vdf.is_file():
                found.append(vdf)
        # De-duplicate while preserving order.
        seen = set()
        unique = []
        for v in found:
            if v not in seen:
                seen.add(v)
                unique.append(v)
        return unique

    def _parse_shortcuts_vdf(self, path: Path) -> dict:
        """
        Parses Steam's binary ``shortcuts.vdf`` and returns a mapping of
        ``{appid (str): AppName}`` for every non-Steam shortcut.

        The ``compatdata`` folder name for a non-Steam game is NOT the ``appid``
        stored inside the vdf. Steam *computes* it as
        ``crc32(<raw bytes>) | 0x80000000`` where ``<raw bytes>`` is the exact
        on-disk concatenation of the shortcut's Executable path and its display
        name, separated by a single NUL byte. We therefore hash the RAW bytes as
        they are stored (string = UTF-8, wstring = UTF-16-LE) so we match Steam
        bit-for-bit — decoding and re-encoding would corrupt non-ASCII / UTF-16
        values. We try both ``Exe\\0AppName`` and ``AppName\\0Exe`` orderings
        because different Steam versions differ here, and we also honour an
        explicit ``appid`` field when present.

        The binary VDF format used here:
          - ``0x00`` marks the start of a sub-node (name follows, children until 0x08)
          - ``0x08`` closes the current node
          - value types: 0x01 string, 0x02 int32, 0x05 wstring (UTF-16-LE), 0x07 uint64
        """
        try:
            with open(path, "rb") as f:
                data = f.read()
        except Exception:
            return {}

        result: dict = {}
        n = len(data)

        def read_bytes_until_null(pos: int):
            try:
                end = data.index(b"\x00", pos)
            except ValueError:
                end = n
            return data[pos:end], end + 1

        def read_wbytes_until_double_null(pos: int):
            i = pos
            while i + 1 < n and not (data[i] == 0 and data[i + 1] == 0):
                i += 2
            return data[pos:i], i + 2

        def recurse(pos: int):
            node: dict = {}
            while pos < n:
                typ = data[pos]
                pos += 1
                if typ == 0x08:  # end of node
                    break
                # A node name is always a plain (0x01) string; keep its raw bytes.
                name_raw, pos = read_bytes_until_null(pos)
                name = name_raw.decode("utf-8", "replace")
                if typ == 0x01:  # string -> keep raw UTF-8 bytes
                    val, pos = read_bytes_until_null(pos)
                    node[name] = ("str", val)
                elif typ == 0x02:  # int32
                    val = int.from_bytes(data[pos:pos + 4], "little")
                    pos += 4
                    node[name] = ("int", val)
                elif typ == 0x05:  # wstring -> keep raw UTF-16-LE bytes
                    val, pos = read_wbytes_until_double_null(pos)
                    node[name] = ("wstr", val)
                elif typ == 0x07:  # uint64
                    val = int.from_bytes(data[pos:pos + 8], "little")
                    pos += 8
                    node[name] = ("int", val)
                else:  # 0x00 or unknown -> sub-node
                    sub, pos = recurse(pos)
                    node[name] = ("node", sub)
            return node, pos

        try:
            root, _ = recurse(0)
        except Exception:
            # Malformed tail: return whatever we parsed so far rather than nothing.
            return result

        def decode_entry(entry):
            if not isinstance(entry, tuple):
                return None
            kind, raw = entry
            try:
                return raw.decode("utf-16-le" if kind == "wstr" else "utf-8", "replace")
            except Exception:
                return None

        def extract(node):
            if isinstance(node, dict):
                exe = node.get("Exe")
                app_name = node.get("AppName")
                # A real shortcut always carries both Exe and AppName. Hash their
                # raw bytes so we reproduce Steam's computed appid exactly.
                if isinstance(exe, tuple) and isinstance(app_name, tuple):
                    exe_bytes = exe[1]
                    name_bytes = app_name[1]
                    display = decode_entry(app_name)
                    if display:
                        for combo in (
                            exe_bytes + b"\x00" + name_bytes,
                            name_bytes + b"\x00" + exe_bytes,
                        ):
                            try:
                                aid = zlib.crc32(combo) | 0x80000000
                                result.setdefault(str(aid), display)
                            except Exception:
                                pass
                # Some flavours store an explicit appid; honour it directly.
                appid = node.get("appid")
                if isinstance(appid, tuple) and appid[0] == "int" and isinstance(app_name, tuple):
                    d = decode_entry(app_name)
                    if d:
                        result.setdefault(str(int(appid[1])), d)
                for v in node.values():
                    if isinstance(v, tuple) and v[0] == "node":
                        extract(v[1])

        extract(root)
        return result

    def _resolve_app_name(self, steamapps: Path, appid: str):
        """
        Resolves a game name from its ``appmanifest_<appid>.acf`` file.

        Returns the name, or ``None`` when no manifest is found (e.g. a tool,
        Proton runtime, or a prefix without an installed app).
        """
        manifest = steamapps / f"appmanifest_{appid}.acf"
        if not manifest.is_file():
            return None
        try:
            with open(manifest, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    m = re.search(r'"name"\s*"([^"]*)"', line)
                    if m:
                        return m.group(1)
        except Exception:
            return None
        return None
