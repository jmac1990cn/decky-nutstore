from asyncio import create_subprocess_exec
from asyncio.subprocess import Process
import subprocess
import decky_plugin
import plugin_config
import os
import os.path
from glob import glob


class RcloneSyncManager:
    current_sync: Process | None = None
    # Each in-flight sync is tracked individually so we can wait for all of them
    # and remember the local path of each.
    active_syncs: list[dict] = []

    async def delete_lock_files(self):
        """
        Deletes rclone lock files
        """
        decky_plugin.logger.info("Deleting lock files.")
        for hgx in glob(decky_plugin.HOME + "/.cache/rclone/bisync/*.lck"):
            os.remove(hgx)

    # ------------------------------------------------------------------
    # Helpers for the per-folder, flat-to-root, directional sync model.
    # ------------------------------------------------------------------

    def _read_sync_file(self, path: str) -> list[str]:
        """Reads a sync paths file and returns its non-empty, stripped lines."""
        try:
            with open(path) as f:
                return [line.strip() for line in f if line.strip()]
        except FileNotFoundError:
            return []

    def _normalize_include(self, raw: str):
        """
        Normalizes an include entry.

        Returns (local_path, recursive):
          - '/a/b/**'  -> ('/a/b', True)   full recursive subtree
          - '/a/b/*'   -> ('/a/b', False)  immediate children only
          - '/a/b'     -> ('/a/b', True)   (a file, or full dir)
        """
        if raw.endswith("/**"):
            return raw[:-3], True
        if raw.endswith("/*"):
            return raw[:-2], False
        return raw, True

    def _normalize_exclude(self, raw: str):
        """
        Normalizes an exclude entry.

        Returns (local_path, kind) where kind is one of:
          'file'    -> a single file
          'rec'     -> a recursive subtree ('/a/b/**')
          'shallow' -> immediate children only ('/a/b/*')
        """
        if raw.endswith("/**"):
            return raw[:-3], "rec"
        if raw.endswith("/*"):
            return raw[:-2], "shallow"
        return raw, "file"

    def _cloud_name(self, local: str) -> str:
        """The folder/file name used on the Nutstore side (flat at root)."""
        return os.path.basename(local.rstrip("/")) or local

    def _unique_cloud_name(self, local: str, used: set) -> str:
        """
        Returns a cloud-side name for `local` that does not collide with names
        already used in this run (two different local folders can share a
        basename, e.g. both named 'Saves').
        """
        name = self._cloud_name(local)
        if name not in used:
            return name
        base = name
        i = 1
        while f"{base}__{i}" in used:
            i += 1
        return f"{base}__{i}"

    # ------------------------------------------------------------------
    # Sync
    # ------------------------------------------------------------------

    async def sync_now(self, direction: str, resync: bool):
        """
        Synchronizes each configured path independently, in one direction.

        Each included SteamDeck path is synced to/from the Nutstore root using
        its own folder/file name, so the cloud layout is flat and easy to find
        on a PC, and the local SteamDeck path is remembered (stored in the
        includes file) so a reverse sync restores the data to the same place.

        Parameters:
        direction (str): 'upload'   -> copy SteamDeck -> Nutstore (SD to cloud)
                         'download' -> copy Nutstore -> SteamDeck (cloud to SD)
        resync (bool):   Kept for API compatibility; directional copy does not
                         require a resync step.
        """
        self.active_syncs = []

        dest_subdir = (plugin_config.get_config_item("destination_directory", "") or "").strip().rstrip("/")
        additional_args = [x for x in plugin_config.get_config_item("additional_sync_args", "").split(' ') if x]

        include_paths = self._read_sync_file(plugin_config.cfg_syncpath_includes_file)
        exclude_paths = [self._normalize_exclude(e) for e in self._read_sync_file(plugin_config.cfg_syncpath_excludes_file)]

        used_names: set[str] = set()
        specs: list[tuple] = []  # (args, local)

        for raw in include_paths:
            local, recursive = self._normalize_include(raw)
            if not local:
                continue

            cloud_name = self._unique_cloud_name(local, used_names)
            used_names.add(cloud_name)

            cloud_target = f"backend:{dest_subdir}/{cloud_name}" if dest_subdir else f"backend:{cloud_name}"

            if direction == "download":
                # The cloud folder may not exist yet (it was never uploaded).
                # Skip it gracefully instead of failing the whole sync.
                check = await create_subprocess_exec(plugin_config.rclone_bin, "ls", cloud_target)
                await check.communicate()
                if check.returncode != 0:
                    decky_plugin.logger.warning(
                        "Cloud folder %s not found, skipping download for %s", cloud_target, local)
                    continue
                args = ["copy", cloud_target, local]
            else:
                args = ["copy", local, cloud_target]

            if not recursive:
                args.extend(["--max-depth", "1"])

            # Excludes only make sense when uploading (they prune what gets
            # pushed to the cloud); on download we mirror the cloud folder back.
            if direction != "download":
                for ex_local, ex_kind in exclude_paths:
                    if ex_local == local or ex_local.startswith(local + "/"):
                        rel = ex_local[len(local):]
                        if ex_kind == "file":
                            args.extend(["--exclude", rel])
                        elif ex_kind == "shallow":
                            args.extend(["--exclude", rel + "/*"])
                        else:
                            args.extend(["--exclude", rel + "/**"])

            args.extend(["--copy-links", "--transfers", "8", "--checkers", "16", "--log-file",
                         decky_plugin.DECKY_PLUGIN_LOG, "--log-format", "none", "-v"])
            args.extend(additional_args)

            specs.append((args, local))

        for args, local in specs:
            cmd = [plugin_config.rclone_bin, *args]
            decky_plugin.logger.info("Running command: %s", subprocess.list2cmdline(cmd))
            proc = await create_subprocess_exec(*cmd)
            self.active_syncs.append({"proc": proc, "local": local})

        self.current_sync = self.active_syncs[-1]["proc"] if self.active_syncs else None
        decky_plugin.logger.info("=== STARTING SYNC (%d paths, direction=%s) ===", len(self.active_syncs), direction)

    async def probe(self):
        """
        Checks if all synchronization processes have finished.

        Returns:
        int | None: The combined return code of all sync processes, or None
        while any of them is still running.
        """
        if not self.active_syncs:
            return 0

        codes = []
        for item in self.active_syncs:
            rc = item["proc"].returncode
            if rc is None:
                return None
            codes.append(rc)

        self.active_syncs = []
        return 0 if all(c in (0, 6) for c in codes) else 1
