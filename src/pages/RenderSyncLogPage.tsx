import { Navigation } from "decky-frontend-lib";
import Container from "../components/Container";
import { Translator } from "../helpers/translator";
import { Storage } from "../helpers/storage";
import { useMemo, useState } from "react";
import { Toast } from "../helpers/toast";
import { ApiClient } from "../helpers/apiClient";

export default function RenderSyncLogPage() {
  Navigation.CloseSideMenus();

  const [logs, _] = useState<string>(() => Storage.getSessionStorageItem("syncLogs")?.replace(/\n{2,}/g, "\n") ?? "");

  return (
    <Container title={Translator.translate("sync.logs")}>
      <div style={{ maxHeight: "300px" }}>
        <pre style={{ overflowY: "scroll", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "smaller", maxHeight: "300px" }}>{logs}</pre>
      </div>
      <SyncLogErrorButtons logs={logs} />
    </Container>
  );
}

function SyncLogErrorButtons({ logs }: { logs: string }) {
  const deleteLockNeeded = useMemo(() => logs.indexOf("rclone deletefile") > 0, [logs]);

  return (
    <div>
      <button
        hidden={!deleteLockNeeded}
        style={{ marginLeft: "10px" }}
        onClick={() => {
          Navigation.CloseSideMenus();
          Navigation.NavigateBack();
          Toast.toast(Translator.translate("deleting.locks.sync"));
          ApiClient.deleteLocksAndResync();
        }}
      >
        {Translator.translate("delete.locks")}
      </button>
    </div>
  );
}
