import { ButtonItem, Navigation, PanelSection, PanelSectionRow } from "decky-frontend-lib";
import { useEffect, useState } from "react";
import Container from "../components/Container";
import SelectableRow, { HighlightButton } from "../components/SelectableRow";
import { PageProps } from "../helpers/types";
import { Storage } from "../helpers/storage";
import { Translator } from "../helpers/translator";

type SaveDir = {
  path: string;
  source: string;
  exists: boolean;
  entries: number;
  lastModified: number | null;
};

const SOURCE_KEYS: Record<string, string> = {
  name_match: "source.name.match",
  common_location: "source.common.location",
  generic: "source.generic",
  user_root: "source.user.root",
};

function formatTime(ms: number | null): string {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleDateString();
  } catch (e) {
    return "";
  }
}

/**
 * Game-Launcher style save detection. Given the game picked on the previous
 * page, lists likely save folders found inside that game's own Proton prefix.
 * Selecting a candidate opens the folder browser rooted at that folder so the
 * user can drill further and pick the exact save folder/file to sync.
 */
export default function ConfigureSteamDetectPage({ serverApi }: PageProps<{}>) {
  const gameName = Storage.getSessionStorageItem("steamGameName") || "";
  const appid = Storage.getSessionStorageItem("steamGameAppid") || "";
  const prefix = Storage.getSessionStorageItem("steamGamePrefix") || "";

  const [dirs, setDirs] = useState<SaveDir[] | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [showEmpty, setShowEmpty] = useState(false);

  useEffect(() => {
    (async () => {
      setDirs(undefined);
      setError(undefined);
      try {
        const res = await serverApi.callPluginMethod<
          { appid: string; name: string; prefix_path: string },
          SaveDir[]
        >("detect_save_dirs", { appid, name: gameName, prefix_path: prefix });
        if (res.success) {
          setDirs(res.result);
        } else {
          setError(String(res.result));
          setDirs([]);
        }
      } catch (e) {
        setError(String(e));
        setDirs([]);
      }
    })();
  }, [appid, gameName, prefix, serverApi]);

  // Open the browser rooted at the candidate so the user can keep drilling
  // into sub-folders (and use "Select this folder" there to add it).
  const openDir = (path: string) => {
    Storage.setSessionStorageItem("steamBrowseStart", path);
    Navigation.CloseSideMenus();
    Navigation.Navigate("/dcs-configure-steam-browse");
  };

  const renderRow = (d: SaveDir) => {
    const sourceLabel = Translator.translate(SOURCE_KEYS[d.source] || d.source);
    const meta = [sourceLabel, `${d.entries} ${Translator.translate("save.files.unit")}`, formatTime(d.lastModified)]
      .filter(Boolean)
      .join(" · ");
    return (
      <PanelSectionRow key={d.path}>
        <SelectableRow
          title={d.path}
          subtitle={meta}
          wrapTitle
          right={<HighlightButton>›</HighlightButton>}
          onClick={() => openDir(d.path)}
        />
      </PanelSectionRow>
    );
  };

  // Folders with zero entries are unlikely saves — collapse them behind a
  // toggle so the useful candidates stay front and center.
  const populated = dirs?.filter((d) => d.entries > 0) ?? [];
  const empty = dirs?.filter((d) => d.entries === 0) ?? [];

  return (
    <Container title={Translator.translate("detect.saves")}>
      <PanelSection>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => Navigation.NavigateBack()}>
            {Translator.translate("back")}
          </ButtonItem>
        </PanelSectionRow>
        <small
          style={{ display: "block", wordBreak: "break-all", marginBottom: 6 }}
        >
          {Translator.translate("detect.hint")}
        </small>
        <small style={{ display: "block", wordBreak: "break-all" }}>
          {Translator.translate("detect.for", { "name": gameName })}
        </small>
      </PanelSection>

      {dirs === undefined && (
        <PanelSectionRow>
          <small>{Translator.translate("detecting")}</small>
        </PanelSectionRow>
      )}

      {dirs && dirs.length === 0 && (
        <PanelSection>
          <PanelSectionRow>
            <small>{error ? error : Translator.translate("no.save.dirs")}</small>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem
              layout="below"
              onClick={() => Navigation.Navigate("/dcs-configure-steam-browse")}
            >
              {Translator.translate("self.select.folder")}
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>
      )}

      {populated.map(renderRow)}

      {empty.length > 0 && (
        <PanelSection>
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={() => setShowEmpty((v) => !v)}>
              {showEmpty
                ? Translator.translate("hide.empty.folders")
                : Translator.translate("show.empty.folders", { "count": empty.length })}
            </ButtonItem>
          </PanelSectionRow>
          {showEmpty && empty.map(renderRow)}
        </PanelSection>
      )}
    </Container>
  );
}
