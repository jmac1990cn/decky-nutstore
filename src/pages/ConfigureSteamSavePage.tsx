import { ButtonItem, Navigation, PanelSection, PanelSectionRow } from "decky-frontend-lib";
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

  const onPickGame = (game: SteamGame) => {
    Storage.setSessionStorageItem("steamBrowseStart", game.path);
    Storage.setSessionStorageItem("steamSaveTarget", targetFile);
    Navigation.CloseSideMenus();
    Navigation.Navigate("/dcs-configure-steam-browse");
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
        <SelectableRow
          key={g.appid}
          title={g.name}
          subtitle={g.appid}
          right={<HighlightButton>{Translator.translate("select")}</HighlightButton>}
          onClick={() => onPickGame(g)}
        />
      ))}
    </Container>
  );
}
