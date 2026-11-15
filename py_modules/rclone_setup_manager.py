import asyncio
from asyncio.subprocess import create_subprocess_exec
import os
import re
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

        Returns:
        list: A list of dicts ``{"appid": str, "name": str, "path": str}`` sorted
              by game name (case-insensitive).
        """
        games = []
        for steamapps in self._steam_steamapps_dirs():
            compatdata = steamapps / "compatdata"
            if not compatdata.is_dir():
                continue
            for entry in compatdata.iterdir():
                if not entry.is_dir() or not entry.name.isdigit():
                    continue
                appid = entry.name
                name = self._resolve_app_name(steamapps, appid) or appid
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

    def _steam_steamapps_dirs(self):
        """
        Returns every known Steam ``steamapps`` directory (native + Flatpak).
        """
        home = Path.home()
        candidates = [
            home / ".steam" / "steam" / "steamapps",
            home / ".var" / "app" / "com.valvesoftware.Steam" / ".steam" / "steam" / "steamapps",
        ]
        return [p for p in candidates if p.is_dir()]

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
