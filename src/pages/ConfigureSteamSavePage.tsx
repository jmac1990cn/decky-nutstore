import { ButtonItem, Menu, MenuItem, Navigation, PanelSection, PanelSectionRow, showContextMenu } from "decky-frontend-lib";
import { useEffect, useState } from "react";
import Container from "../components/Container";
import SelectableRow, { HighlightButton } from "../components/SelectableRow";
import { PageProps } from "../helpers/types";
import { Storage } from "../helpers/storage";
import { Translator } from "../helpers/translator";

export type SteamGame = {
  appid: string;
  name: string;
  path: string;
};

/**
 * Page that mimics protontricks: it lists every Proton compatdata prefix
 * (resolved to its game name) so the user can pick a game and drill into its
 * save folder. Selecting a game opens the folder browser instead of uploading
 * the whole prefix directly.
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

  // Picking a game now offers two independent actions:
  //   1. Browse manually into its Proton prefix (the original flow).
  //   2. Auto-detect likely save folders from the game's name (Game-Launcher style).
  const onPickGame = (game: SteamGame) => {
    // Stash everything both flows need before navigating away.
    Storage.setSessionStorageItem("steamBrowseStart", game.path);
    Storage.setSessionStorageItem("steamSaveTarget", targetFile);
    Storage.setSessionStorageItem("steamGameName", game.name);
    Storage.setSessionStorageItem("steamGameAppid", game.appid);
    Storage.setSessionStorageItem("steamGamePrefix", game.path);

    showContextMenu(
      <Menu label={game.name}>
        <MenuItem
          onSelected={() => {
            Navigation.CloseSideMenus();
            Navigation.Navigate("/dcs-configure-steam-browse");
          }}
        >
          {Translator.translate("self.select.folder")}
        </MenuItem>
        <MenuItem
          onSelected={() => {
            Navigation.CloseSideMenus();
            Navigation.Navigate("/dcs-configure-steam-detect");
          }}
        >
          {Translator.translate("detect.saves")}
        </MenuItem>
      </Menu>
    );
  };

  return (
    <Container title={Translator.translate("steam.saves")}>
      <PanelSection>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => Navigation.NavigateBack()}>
            {Translator.translate("back")}
          </ButtonItem>
        </PanelSectionRow>
        <small>{Translator.translate("steam.save.select.v2")}</small>
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
          <SelectableRow
            title={g.name}
            subtitle={g.appid}
            right={<HighlightButton>{Translator.translate("select")}</HighlightButton>}
            onClick={() => onPickGame(g)}
          />
        </PanelSectionRow>
      ))}
    </Container>
  );
}
