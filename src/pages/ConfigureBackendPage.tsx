import { ButtonItem, PanelSection, PanelSectionRow, TextField } from "decky-frontend-lib";
import { useEffect, useState } from "react";
import { BsCloudFill } from "react-icons/bs";
import Container from "../components/Container";
import { PageProps } from "../helpers/types";
import { ApiClient } from "../helpers/apiClient";
import { Translator } from "../helpers/translator"
import { Toast } from "../helpers/toast";

/**
 * Nutstore (坚果云) WebDAV configuration is now rendered as a normal
 * in-page form instead of a modal. This avoids the Big Picture modal
 * getting stuck (no dismiss button / no focusable inputs) and lets
 * TextField reliably open the Steam on-screen keyboard for typing.
 */
export default function ConfigureBackendPage({ serverApi }: PageProps<{}>) {
  const [provider, setProvider] = useState<string | undefined>(undefined);
  const [url, setUrl] = useState("https://dav.jianguoyun.com/dav/");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    ApiClient.getCloudBackend().then((e) => setProvider(e ?? "N/A"));
  }, []);

  const handleSave = async () => {
    if (!user || !password) {
      Toast.toast(Translator.translate("nutstore.fail") + "：账号和密码均不能为空");
      return;
    }
    setLoading(true);
    try {
      const res = await serverApi.callPluginMethod<{ url: string; user: string; password: string }, string>(
        "setup_webdav",
        { url, user, password }
      );
      setLoading(false);
      if (res.success) {
        Toast.toast(Translator.translate("nutstore.success"));
        ApiClient.getCloudBackend().then((e) => setProvider(e ?? "N/A"));
      } else {
        const errMsg = String(res.result);
        if (errMsg.includes("RCLONE_MISSING")) {
          Toast.toast("配置失败：插件缺少 rclone 程序，请重新安装插件包（需包含 bin/rclone）");
        } else {
          Toast.toast(Translator.translate("nutstore.fail") + "：" + errMsg);
        }
      }
    } catch (e) {
      setLoading(false);
      Toast.toast(Translator.translate("nutstore.fail") + "：" + String(e));
    }
  };

  return (
    <Container title={Translator.translate("nutstore.title")}>
      <PanelSection>
        <strong>{Translator.translate("currently.using")}: {provider}</strong>
      </PanelSection>
      <PanelSection>
        <p style={{ whiteSpace: "pre-wrap", margin: "0 0 12px 0" }}>{Translator.translate("nutstore.desc")}</p>
        <PanelSectionRow>
          <TextField
            label={Translator.translate("nutstore.url")}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <TextField
            label={Translator.translate("nutstore.account")}
            value={user}
            placeholder="you@jianguoyun.com"
            mustBeEmail
            onChange={(e) => setUser(e.target.value)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <TextField
            label={Translator.translate("nutstore.password")}
            value={password}
            bIsPassword
            onChange={(e) => setPassword(e.target.value)}
          />
        </PanelSectionRow>
        <p style={{ whiteSpace: "pre-wrap", marginTop: 12, color: "#a0a0a0", fontSize: 13 }}>
          {Translator.translate("nutstore.hint")}
        </p>
        <PanelSectionRow>
          <ButtonItem
            onClick={handleSave}
            icon={<BsCloudFill />}
            disabled={loading}
          >
            {loading ? Translator.translate("nutstore.configuring") : Translator.translate("nutstore.save")}
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </Container>
  );
}
