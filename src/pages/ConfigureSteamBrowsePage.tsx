import { ButtonItem, ConfirmModal, Navigation, PanelSection, PanelSectionRow, showModal } from "decky-frontend-lib";
import { useEffect, useState } from "react";
import Container from "../components/Container";
import SelectableRow, { HighlightButton } from "../components/SelectableRow";
import { PageProps } from "../helpers/types";
import { Storage } from "../helpers/storage";
import { Toast } from "../helpers/toast";
import { Translator } from "../helpers/translator";

type DirEntry = {
  name: string;
  path: string;
  is_dir: boolean;
};

function parentDir(path: string): string {
  // Strip trailing slash, then drop the last segment.
  const clean = path.replace(/\/+$/, "");
  const idx = clean.lastIndexOf("/");
  return idx <= 0 ? "/" : clean.substring(0, idx);
}

/**
 * In-plugin folder browser. Starts at a game's Proton prefix and lets the user
 * drill down to the exact save folder (or file) before confirming — mirroring
 * the manual folder-picker flow but without relying on Steam's flaky file
 * picker. Selecting a folder/file runs test_syncpath and the usual confirm
 * dialog, then adds the path to the sync list.
 */
export default function ConfigureSteamBrowsePage({ serverApi }: PageProps<{}>) {
  const targetFile = (Storage.getSessionStorageItem("steamSaveTarget") as "includes" | "excludes") || "includes";
  const [currentPath, setCurrentPath] = useState<string>(
    Storage.getSessionStorageItem("steamBrowseStart") || "/home/deck"
  );
  const [entries, setEntries] = useState<DirEntry[] | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      setEntries(undefined);
      setError(undefined);
      try {
        const res = await serverApi.callPluginMethod<{ path: string }, DirEntry[]>("list_directory", { path: currentPath });
        if (res.success) {
          setEntries(res.result);
        } else {
          setError(String(res.result));
          setEntries([]);
        }
      } catch (e) {
        setError(String(e));
        setEntries([]);
      }
    })();
  }, [currentPath, serverApi]);

  const selectPath = (path: string, recursive: boolean) => {
    const full = recursive ? `${path}/**` : path;
    serverApi
      .callPluginMethod<{ path: string }, number>("test_syncpath", { path: full })
      .then((r) => {
        if (!r.success) {
          Toast.toast(r.result);
          return;
        }
        showModal(
          <ConfirmModal
            strTitle={Translator.translate("confirm.add")}
            strDescription={Translator.translate("confirm.add.path", { "path": full, "count": r.result })}
            onOK={() => {
              serverApi
                .callPluginMethod<{ path: string; file: "includes" | "excludes" }, void>("add_syncpath", { path: full, file: targetFile })
                .then(() => {
                  Toast.toast(
                    Translator.translate("added.path", {
                      "file": targetFile === "includes" ? Translator.translate("includes") : Translator.translate("excludes"),
                    })
                  );
                  Navigation.NavigateBack();
                })
                .catch((e) => Toast.toast(e));
            }}
          />
        );
      })
      .catch((e) => Toast.toast(e));
  };

  return (
    <Container title={Translator.translate("browse")}>
      <PanelSection>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => Navigation.NavigateBack()}>
            {Translator.translate("back")}
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            disabled={currentPath === "/"}
            onClick={() => setCurrentPath(parentDir(currentPath))}
          >
            {Translator.translate("up.dir")}
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => selectPath(currentPath, true)}>
            {Translator.translate("select.this.folder")}
          </ButtonItem>
        </PanelSectionRow>
        <small style={{ display: "block", wordBreak: "break-all", opacity: 0.7 }}>{currentPath}</small>
      </PanelSection>

      {entries === undefined && (
        <PanelSectionRow>
          <small>{Translator.translate("loading.dir")}</small>
        </PanelSectionRow>
      )}

      {entries && entries.length === 0 && (
        <PanelSectionRow>
          <small>{error ? error : Translator.translate("empty.folder")}</small>
        </PanelSectionRow>
      )}

      {entries?.map((e) => (
        <PanelSectionRow key={e.path}>
          <SelectableRow
            title={e.name}
            subtitle={e.is_dir ? Translator.translate("folder") : Translator.translate("file")}
            right={
              e.is_dir ? (
                <HighlightButton>›</HighlightButton>
              ) : (
                <HighlightButton>{Translator.translate("select")}</HighlightButton>
              )
            }
            onClick={() => (e.is_dir ? setCurrentPath(e.path) : selectPath(e.path, false))}
          />
        </PanelSectionRow>
      ))}
    </Container>
  );
}
