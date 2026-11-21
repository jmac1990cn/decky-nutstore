import { ButtonItem, ConfirmModal, Navigation, PanelSection, PanelSectionRow, showModal } from "decky-frontend-lib";
import { useEffect, useState } from "react";
import Container from "../components/Container";
import SelectableRow, { HighlightButton } from "../components/SelectableRow";
import { PageProps } from "../helpers/types";
import { Storage } from "../helpers/storage";
import { Toast } from "../helpers/toast";
import { Translator } from "../helpers/translator";

type SaveDir = {
  path: string;
  source: string;
  exists: boolean;
  entries: number;
  lastModified: number | null;
};

const SOURCE_KEYS: Record<string, string> = {
  proton_user: "source.proton.user",
  generic: "source.generic",
  user_root: "source.user.root",
};

function formatTime(ms: number | null): string {
  if (!ms) return "";
  try {
    const d = new Date(ms);
    return d.toLocaleDateString();
  } catch (e) {
    return "";
  }
}

/**
 * Game-Launcher style save detection. Given the game picked on the previous
 * page, asks the backend to probe likely save folders by name and lists the
 * results. Selecting one runs the usual test_syncpath + confirm + add flow.
 */
export default function ConfigureSteamDetectPage({ serverApi }: PageProps<{}>) {
  const targetFile = (Storage.getSessionStorageItem("steamSaveTarget") as "includes" | "excludes") || "includes";
  const gameName = Storage.getSessionStorageItem("steamGameName") || "";
  const appid = Storage.getSessionStorageItem("steamGameAppid") || "";
  const prefix = Storage.getSessionStorageItem("steamGamePrefix") || "";

  const [dirs, setDirs] = useState<SaveDir[] | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

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

  // Selecting a detected folder adds it (recursively) via the standard flow.
  const selectDir = (path: string) => {
    const full = `${path}/**`;
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
                .callPluginMethod<{ path: string; file: "includes" | "excludes" }, void>(
                  "add_syncpath", { path: full, file: targetFile }
                )
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
    <Container title={Translator.translate("detect.saves")}>
      <PanelSection>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => Navigation.NavigateBack()}>
            {Translator.translate("back")}
          </ButtonItem>
        </PanelSectionRow>
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

      {dirs?.map((d) => {
        const sourceLabel = Translator.translate(SOURCE_KEYS[d.source] || d.source);
        const meta = [sourceLabel, `${d.entries} ${Translator.translate("save.files.unit")}`, formatTime(d.lastModified)]
          .filter(Boolean)
          .join(" · ");
        return (
          <PanelSectionRow key={d.path}>
            <SelectableRow
              title={d.path}
              subtitle={meta}
              right={<HighlightButton>{Translator.translate("select")}</HighlightButton>}
              onClick={() => selectDir(d.path)}
            />
          </PanelSectionRow>
        );
      })}
    </Container>
  );
}
