import { ButtonItem, ConfirmModal, Navigation, PanelSection, PanelSectionRow, showModal } from "decky-frontend-lib";
import { useEffect, useState } from "react";
import Container from "../components/Container";
import { PageProps } from "../helpers/types";
import { Storage } from "../helpers/storage";
import { Toast } from "../helpers/toast";
import { Translator } from "../helpers/translator";

export type SteamGame = {
  appid: string;
  name: string;
  path: string;
};

/**
 * Page that mimics protontricks: it lists every Proton compatdata prefix
 * (resolved to its game name) so the user can pick a game and add its Proton
 * save folder to the sync paths.
 */
export default function ConfigureSteamSavePage({ serverApi }: PageProps<{}>) {
  const [games, setGames] = useState<SteamGame[] | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  // The "includes" / "excludes" target is passed through session storage by
  // AddNewPathButton, exactly like the rest of this plugin.
  const targetFile = (Storage.getSessionStorageItem("steamSaveTarget") as "includes" | "excludes") || "includes";

  useEffect(() => {
    (async () => {
      try {
        const res = await serverApi.callPluginMethod<{}, SteamGame[]>("list_steam_compatdata", {});
        if (res.success) {
          setGames(res.result);
        } else {
          setError(String(res.result));
          setGames([]);
        }
      } catch (e) {
        setError(String(e));
        setGames([]);
      }
    })();
  }, [serverApi]);

  const onAddGame = (game: SteamGame) => {
    const path = `${game.path}/**`;
    serverApi
      .callPluginMethod<{ path: string }, number>("test_syncpath", { path })
      .then((r) => {
        if (!r.success) {
          Toast.toast(r.result);
          return;
        }
        showModal(
          <ConfirmModal
            strTitle={Translator.translate("confirm.add")}
            strDescription={Translator.translate("confirm.add.path", { "path": path, "count": r.result })}
            onOK={() => {
              serverApi
                .callPluginMethod<{ path: string; file: "includes" | "excludes" }, void>("add_syncpath", { path, file: targetFile })
                .then(() => {
                  Toast.toast(
                    Translator.translate("added.game", { "name": game.name, "file": targetFile === "includes" ? Translator.translate("includes") : Translator.translate("excludes") })
                  );
                })
                .catch((e) => Toast.toast(e));
            }}
          />
        );
      })
      .catch((e) => Toast.toast(e));
  };

  return (
    <Container title={Translator.translate("steam.saves")}>
      <PanelSection>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => Navigation.NavigateBack()}>
            {Translator.translate("back")}
          </ButtonItem>
        </PanelSectionRow>
        <small>{Translator.translate("steam.save.select")}</small>
      </PanelSection>

      {games === undefined && (
        <PanelSectionRow>
          <small>{Translator.translate("loading.games")}</small>
        </PanelSectionRow>
      )}

      {games && games.length === 0 && (
        <PanelSectionRow>
          <small>{error ? error : Translator.translate("no.compatdata")}</small>
        </PanelSectionRow>
      )}

      {games?.map((g) => (
        <PanelSectionRow key={g.appid}>
          <ButtonItem
            layout="below"
            onClick={() => onAddGame(g)}
            label={
              <div>
                <div>{g.name}</div>
                <div style={{ fontSize: "12px", opacity: 0.7 }}>{g.appid}</div>
              </div>
            }
          />
        </PanelSectionRow>
      ))}
    </Container>
  );
}
