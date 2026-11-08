(function (deckyFrontendLib, React) {
    'use strict';

    function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

    var React__default = /*#__PURE__*/_interopDefaultLegacy(React);

    /**
     * The Backend class provides access to plugin Python backend methods
     */
    class Backend {
        /**
         * Private constructor to prevent instantiation
         */
        constructor() {
        }
        /**
         * Method to initialize the server API
         * @param serverApi - An instance of ServerAPI
         */
        static initialize(serverApi) {
            Backend.serverApi = serverApi;
        }
        /**
         * Generic method to make backend calls to Python plugin methods
         * @param name - The name of the method to call
         * @param params - The parameters to pass to the method
         * @returns A Promise of the result type
         */
        static async backend_call(name, params) {
            try {
                const res = await Backend.serverApi.callPluginMethod(name, params);
                if (res.success) {
                    let result = res.result;
                    return result;
                }
                else {
                    let result = res.result;
                    throw result;
                }
            }
            catch (e) {
                throw e;
            }
        }
        /**
         * Method that delete lock files
         * @returns A Promise of the result type
         */
        static async deleteLockFiles() {
            return Backend.backend_call("delete_lock_files", {});
        }
        /**
         * Method to send a signal to a process
         * @param pid - The process ID
         * @param s - The signal type ('SIGSTOP' or 'SIGCONT')
         * @returns A Promise of the result type
         */
        static async signal(pid, s) {
            return Backend.backend_call("signal", { pid, s });
        }
        /**
         * Method to get the last sync log
         * @returns A Promise of the log as a string
         */
        static async getLastSyncLog() {
            return Backend.backend_call("get_last_sync_log", {});
        }
        /**
         * Method to get the plugin log
         * @returns A Promise of the log as a string
         */
        static async getPluginLog() {
            return Backend.backend_call("get_plugin_log", {});
        }
        /**
         * Method to get the log level
         * @returns A Promise of the log level as a string
         */
        static async getLogLevel() {
            return Backend.backend_call("get_log_level", {});
        }
        /**
         * Method to log a message
         * @param lvl - The log level
         * @param args - The arguments to log
         * @returns A Promise that resolves when the log is complete
         */
        static async log(lvl, ...args) {
            return Backend.backend_call("log", { level: lvl, msg: `[UI]: ${JSON.stringify(args)}` });
        }
    }
    /**
     * Static instance of ServerAPI to handle API calls
     */
    Backend.serverApi = null;

    /**
     * Represents log levels.
     */
    var LogLevel;
    (function (LogLevel) {
        LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
        LogLevel[LogLevel["INFO"] = 1] = "INFO";
        LogLevel[LogLevel["WARN"] = 2] = "WARN";
        LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    })(LogLevel || (LogLevel = {}));
    /**
     * Represents a logging utility.
     */
    class Logger {
        constructor() {
        }
        /**
         * Initializes the logger.
         */
        static async initialize() {
            const level = await Backend.getLogLevel();
            Logger.currentLevel = LogLevel[level];
            Logger.log(LogLevel.INFO, "Logger initialized at level '" + LogLevel[Logger.currentLevel] + "'");
        }
        /**
         * Logs a message.
         * @param lvl - The log level.
         * @param args - The message arguments.
         */
        static log(lvl, ...args) {
            if (Logger.isLevelEnabled(lvl)) {
                Backend.log(LogLevel[lvl], ...args);
                console.log("%c %s %c %s ", Logger.prefixStyle, Logger.prefix, Logger.levelStyles[lvl], LogLevel[lvl], ...args);
            }
        }
        /**
         * Checks if a log level is enabled.
         * @param lvl - The log level.
         * @returns True if the log level is enabled, otherwise false.
         */
        static isLevelEnabled(lvl) {
            return Logger.currentLevel <= lvl;
        }
        /**
         * Logs a debug message.
         * @param args - The message arguments.
         */
        static debug(...args) {
            Logger.log(LogLevel.DEBUG, ...args);
        }
        /**
         * Logs an info message.
         * @param args - The message arguments.
         */
        static info(...args) {
            Logger.log(LogLevel.INFO, ...args);
        }
        /**
         * Logs a warning message.
         * @param args - The message arguments.
         */
        static warn(...args) {
            Logger.log(LogLevel.WARN, ...args);
        }
        /**
         * Logs an error message.
         * @param args - The message arguments.
         */
        static error(...args) {
            Logger.log(LogLevel.ERROR, ...args);
        }
    }
    /**
     * The style for the logger prefix.
     */
    Logger.prefixStyle = "background-color: blue; color: white; font-weight: bold";
    /**
     * Styles for different log levels.
     */
    Logger.levelStyles = {
        [LogLevel.DEBUG]: "background-color: PowderBlue; font-weight:bold;",
        [LogLevel.INFO]: "background-color: PaleGreen; font-weight:bold",
        [LogLevel.WARN]: "background-color: Gold; font-weight:bold",
        [LogLevel.ERROR]: "background-color: LightSalmon; font-weight:bold",
    };
    /**
     * The prefix for log messages.
     */
    Logger.prefix = "Decky Nutstore";
    /**
     * The current log level.
     */
    Logger.currentLevel = LogLevel.INFO;

    class AppState {
        constructor() {
            this._subscribers = [];
            this._currentState = {
                syncing: "false",
                sync_on_game_exit: "true",
                experimental_menu: "false",
                toast_auto_sync: "true",
                destination_directory: "",
                playing: "false"
            };
            this._serverApi = null;
            this._alreadyInit = true;
            this.setState = (key, value, persist = false) => {
                this._currentState = { ...this.currentState, [key]: value };
                Logger.debug("Setting '" + key + "' to '" + value + "' with persistence: " + persist);
                if (persist) {
                    this.serverApi.callPluginMethod("set_config", { key, value }).then(e => Logger.debug(e));
                }
                this._subscribers.forEach((e) => e.callback(this.currentState));
            };
            this.subscribe = (callback) => {
                const id = new Date().getTime();
                this._subscribers.push({ id, callback });
                return id;
            };
            this.unsubscribe = (id) => {
                const index = this._subscribers.findIndex((f) => f.id === id);
                if (index > -1) {
                    this._subscribers.splice(index, 1);
                }
            };
        }
        get currentState() {
            return this._currentState;
        }
        get serverApi() {
            return this._serverApi;
        }
        get alreadyInit() {
            return this._alreadyInit;
        }
        async initialize(serverApi) {
            if (this._serverApi == null) {
                this._alreadyInit = false;
            }
            this._serverApi = serverApi;
            const data = await serverApi.callPluginMethod("get_config", {});
            if (data.success) {
                data.result.forEach((e) => this.setState(e[0], e[1]));
            }
            else {
                Logger.error(data);
            }
        }
        get experimental_menu() {
            return this.currentState.experimental_menu;
        }
    }
    class ApplicationState {
        constructor() {
        }
        static async initialize(serverApi) {
            await this.appState.initialize(serverApi);
        }
        static getAppState() {
            return ApplicationState.appState;
        }
    }
    ApplicationState.appState = new AppState();
    ApplicationState.useAppState = () => {
        const [state, setState] = React.useState(ApplicationState.appState.currentState);
        React.useEffect(() => {
            const id = ApplicationState.appState.subscribe((e) => {
                Logger.debug("Rendering: " + JSON.stringify(e));
                setState(e);
            });
            return () => {
                ApplicationState.appState.unsubscribe(id);
            };
        }, []);
        return state;
    };
    ApplicationState.setAppState = ApplicationState.appState.setState;
    ApplicationState.getServerApi = () => ApplicationState.appState.serverApi;

    var toastIcon = 'http://127.0.0.1:1337/plugins/decky-nutstore/assets/toastIcon-276306f4.png';

    /**
     * Represents a toast notification utility.
     */
    class Toast {
        constructor() {
        }
        /**
         * Displays a toast notification.
         * @param msg - The message to display.
         * @param ms - The duration of the toast notification in milliseconds (default is 2000).
         * @param clickAction - The action to perform when the toast notification is clicked (default is an empty function).
         */
        static toast(msg, ms = 2000, clickAction = () => { }) {
            ApplicationState.getServerApi().toaster.toast({ title: "Decky Nutstore", body: msg, duration: ms, logo: Toast.ico, onClick: clickAction });
        }
    }
    /**
     * Icon for the toast notification.
     */
    Toast.ico = window.SP_REACT.createElement("img", { width: "30", style: { marginTop: "5px", marginLeft: "10px" }, src: toastIcon });

    var sync$6 = "Sync";
    var configuration$6 = "Configuration";
    var file$6 = "File";
    var folder$6 = "Folder";
    var includes$6 = "Includes";
    var excludes$6 = "Excludes";
    var english = {
    	sync: sync$6,
    	"sync.now": "Sync Now",
    	"sync.upload": "SD → Cloud (Upload saves)",
    	"sync.download": "Cloud → SD (Download saves)",
    	"resync.now": "Resync Now",
    	"provider.not.configured": "Cloud Storage Provider is not configured. Please configure it in 'Cloud Provider'",
    	"sync.start.stop": "Sync on game start & stop",
    	"toast.auto.sync": "Toast after auto sync",
    	configuration: configuration$6,
    	"sync.paths": "Sync Paths",
    	"cloud.provider": "Cloud Provider",
    	"experimental.use.risk": "Experimental Features",
    	"bidirectional.sync": "Bidirectional Sync",
    	"you.mad": "Are you mad??",
    	"warning.root": "For your own safety, ability to sync the whole file system is disabled",
    	"confirm.add": "Confirm Add",
    	"confirm.add.path": "Path {{path}} matches {{count}} file(s). Proceed?",
    	"select.path": "Select Path to Sync",
    	file: file$6,
    	folder: folder$6,
    	"folder.exclude": "Folder (exclude subfolders)",
    	"add.to.sync": "Add Path to Sync",
    	"exclude.from.sync": "Exclude Path from Sync",
    	"confirm.remove": "Confirm Remove",
    	"removing.path": "Removing Path {{path}} Proceed?",
    	"includes.vs.exclude": "Includes vs Excludes",
    	"help.exclude": "As of v1.2.0, it is possible to exclude certain folders from sync.\n\nDuring sync, the plugin first looks at the excludes list to see if a file (or folder) is not excluded, and only then it checks for files in the included list.\n\nFor example, if folder /a/** is included, but file /a/b is excluded, all files except for b would be backed up.",
    	"include.or.exclude.subf": "Include or exclude subfolders",
    	"help.include.or.exclude.subf": "There may be cases where it is necessary to only back up a folder without recursively digging deeper into subfolders. For those cases you can use option 'Folder (exclude subfolders)'.\n\nSuch cases are quite niche; in general the 'Folder' option should be used instead.",
    	"bug.file.picker": "Bug: File Picker loads indefinitely",
    	"help.file.picker.fail": "After a fresh install, the file picker sometimes fails to load. Restarting Steam fixes this.\nSee more details for the discussion",
    	"cloud.save.path": "Nutstore folder (leave empty to upload to the root)",
    	"configure.provider": "Configure Cloud Storage Provider",
    	"currently.using": "Currently using",
    	"click.providers": "Click the button below to configure Nutstore (WebDAV) as the backup destination.",
    	includes: includes$6,
    	excludes: excludes$6,
    	"waiting.previous": "Waiting for previous sync",
    	"synchronizing.savedata": "Synchronizing savedata",
    	"sync.failed": "Error. Click here to see the errors.",
    	"sync.completed": "Sync completed in {{time}}s",
    	"sync.conflict": "Conflicts occured while performing sync.",
    	"rclone.error.logs": "Error sync logs",
    	"resynchronizing.savedata": "Resynchronizing savedata, please wait",
    	"log.files": "Log files",
    	"app.logs": "Plugin logs",
    	"sync.logs": "Sync logs",
    	"no.available.logs": "No available logs",
    	"deleting.locks.sync": "Deleting locks and syncing",
    	"delete.locks": "Delete locks",
    	"nutstore.backend": "Nutstore WebDAV",
    	"nutstore.title": "Nutstore (WebDAV)",
    	"nutstore.desc": "Sync game saves using Nutstore's WebDAV service. Stable and fast access from within China, no VPN required.",
    	"nutstore.url": "WebDAV URL",
    	"nutstore.account": "Nutstore account (email)",
    	"nutstore.password": "App-specific password",
    	"nutstore.configuring": "Configuring Nutstore WebDAV...",
    	"nutstore.success": "Configuration successful! Switched to Nutstore WebDAV.",
    	"nutstore.fail": "Configuration failed",
    	"nutstore.hint": "Note: the app-specific password is NOT your login password. Generate one first at Nutstore web -> Security -> Third-party app authorization, then paste it here.",
    	"nutstore.save": "Save & Configure",
    	"nutstore.cancel": "Cancel"
    };

    var sync$5 = "Sincronización";
    var configuration$5 = "Configuración";
    var file$5 = "Archivo";
    var folder$5 = "Carpeta";
    var includes$5 = "Inclusiones";
    var excludes$5 = "Exclusiones";
    var spanish = {
    	sync: sync$5,
    	"sync.now": "Sincronizar Ahora",
    	"resync.now": "Resincronizar Ahora",
    	"provider.not.configured": "El proveedor de almacenamiento en la nube no está configurado. Por favor, configúralo en 'Proveedor de Nube'",
    	"sync.start.stop": "Sincronizar al iniciar y detener el juego",
    	"toast.auto.sync": "Notificación después de sincronización automática",
    	configuration: configuration$5,
    	"sync.paths": "Rutas de Sincronización",
    	"cloud.provider": "Proveedor de Nube",
    	"experimental.use.risk": "Uso Experimental BAJO SU PROPIO RIESGO",
    	"bidirectional.sync": "Sincronización Bidireccional",
    	"you.mad": "¿Estás loco??",
    	"warning.root": "Por tu seguridad, la capacidad de sincronizar todo el sistema de archivos está deshabilitada",
    	"confirm.add": "Confirmar Añadir",
    	"confirm.add.path": "La ruta {{path}} coincide con {{count}} archivo(s). ¿Continuar?",
    	"select.path": "Seleccionar Ruta para Sincronizar",
    	file: file$5,
    	folder: folder$5,
    	"folder.exclude": "Carpeta (excluir subcarpetas)",
    	"add.to.sync": "Añadir Ruta para Sincronizar",
    	"exclude.from.sync": "Excluir Ruta de Sincronización",
    	"confirm.remove": "Confirmar Eliminar",
    	"removing.path": "Eliminando Ruta {{path}} ¿Continuar?",
    	"includes.vs.exclude": "Inclusiones vs Exclusiones",
    	"help.exclude": "A partir de v1.2.0, es posible excluir ciertas carpetas de la sincronización.\n\nDurante la sincronización, el complemento primero revisa la lista de exclusiones para ver si un archivo (o carpeta) no está excluido, y solo entonces revisa los archivos en la lista de inclusiones.\n\nPor ejemplo, si se incluye la carpeta /a/**, pero se excluye el archivo /a/b, todos los archivos excepto b serían respaldados.",
    	"include.or.exclude.subf": "Incluir o excluir subcarpetas",
    	"help.include.or.exclude.subf": "Puede haber casos en los que sea necesario respaldar solo una carpeta sin buscar recursivamente en subcarpetas. Para esos casos puedes usar la opción 'Carpeta (excluir subcarpetas)'.\n\nEstos casos son bastante específicos; en general, la opción 'Carpeta' debería ser utilizada en su lugar.",
    	"bug.file.picker": "Error: Selector de Archivos carga indefinidamente",
    	"help.file.picker.fail": "Después de una instalación nueva, a veces el selector de archivos no carga. Reiniciar Steam soluciona esto.\nVer más detalles en la discusión",
    	"cloud.save.path": "Ruta de Guardado en la Nube",
    	"configure.provider": "Configurar Proveedor de Almacenamiento en la Nube",
    	"currently.using": "Actualmente usando",
    	"click.providers": "Haz clic en el botón de abajo para configurar Nutstore (WebDAV) como destino de respaldo.",
    	includes: includes$5,
    	excludes: excludes$5,
    	"waiting.previous": "Esperando la sincronización anterior",
    	"synchronizing.savedata": "Sincronizando datos guardados",
    	"sync.failed": "Error. Haz clic aquí para ver los errores.",
    	"sync.completed": "Sincronización completada en {{time}}s",
    	"sync.conflict": "Se produjeron conflictos al realizar la sincronización.",
    	"rclone.error.logs": "Registros de error de sincronización",
    	"resynchronizing.savedata": "Resincronizando datos, espera",
    	"log.files": "Archivos de registro",
    	"app.logs": "Registros del plugin",
    	"sync.logs": "Registros de sincronización",
    	"no.available.logs": "No hay registros disponibles",
    	"deleting.locks.sync": "Eliminando bloqueos y sincronizando",
    	"delete.locks": "Eliminar bloqueos"
    };

    var sync$4 = "Synchronisation";
    var configuration$4 = "Configuration";
    var file$4 = "Fichier";
    var folder$4 = "Dossier";
    var includes$4 = "Inclusions";
    var excludes$4 = "Exclusions";
    var french = {
    	sync: sync$4,
    	"sync.now": "Synchroniser Maintenant",
    	"resync.now": "Resynchroniser Maintenant",
    	"provider.not.configured": "Le fournisseur de stockage en nuage n'est pas configuré. Veuillez le configurer dans 'Fournisseur de Nuage'",
    	"sync.start.stop": "Synchroniser au démarrage et à l'arrêt du jeu",
    	"toast.auto.sync": "Toast après synchronisation automatique",
    	configuration: configuration$4,
    	"sync.paths": "Chemins de Synchronisation",
    	"cloud.provider": "Fournisseur de Nuage",
    	"experimental.use.risk": "Utilisation Expérimentale À VOS PROPRES RISQUES",
    	"bidirectional.sync": "Synchronisation Bidirectionnelle",
    	"you.mad": "Es-tu fou ??",
    	"warning.root": "Pour votre sécurité, la capacité de synchroniser tout le système de fichiers est désactivée",
    	"confirm.add": "Confirmer Ajout",
    	"confirm.add.path": "Le chemin {{path}} correspond à {{count}} fichier(s). Continuer ?",
    	"select.path": "Sélectionner le Chemin à Synchroniser",
    	file: file$4,
    	folder: folder$4,
    	"folder.exclude": "Dossier (exclure les sous-dossiers)",
    	"add.to.sync": "Ajouter Chemin à Synchroniser",
    	"exclude.from.sync": "Exclure Chemin de Synchronisation",
    	"confirm.remove": "Confirmer Suppression",
    	"removing.path": "Suppression du Chemin {{path}} Continuer ?",
    	"includes.vs.exclude": "Inclusions vs Exclusions",
    	"help.exclude": "À partir de la version 1.2.0, il est possible d'exclure certains dossiers de la synchronisation.\n\nPendant la synchronisation, le plugin vérifie d'abord la liste des exclusions pour voir si un fichier (ou un dossier) n'est pas exclu, et seulement alors il vérifie les fichiers dans la liste des inclusions.\n\nPar exemple, si le dossier /a/** est inclus, mais le fichier /a/b est exclu, tous les fichiers sauf b seraient sauvegardés.",
    	"include.or.exclude.subf": "Inclure ou exclure les sous-dossiers",
    	"help.include.or.exclude.subf": "Il peut y avoir des cas où il est nécessaire de sauvegarder uniquement un dossier sans rechercher récursivement dans les sous-dossiers. Pour ces cas, vous pouvez utiliser l'option 'Dossier (exclure les sous-dossiers)'.\n\nCes cas sont assez spécifiques ; en général, l'option 'Dossier' devrait être utilisée à la place.",
    	"bug.file.picker": "Bogue : Le Sélecteur de Fichiers se charge indéfiniment",
    	"help.file.picker.fail": "Après une installation fraîche, le sélecteur de fichiers échoue parfois à se charger. Redémarrer Steam résout ce problème.\nVoir plus de détails dans la discussion",
    	"cloud.save.path": "Chemin de Sauvegarde en Nuage",
    	"configure.provider": "Configurer le Fournisseur de Stockage en Nuage",
    	"currently.using": "Actuellement en cours d'utilisation",
    	"click.providers": "Cliquez sur le bouton ci-dessous pour configurer Nutstore (WebDAV) comme destination de sauvegarde.",
    	includes: includes$4,
    	excludes: excludes$4,
    	"waiting.previous": "En attente de la synchronisation précédente",
    	"synchronizing.savedata": "Synchronisation des données sauvegardées",
    	"sync.failed": "Erreur. Cliquez ici pour voir les erreurs.",
    	"sync.completed": "Synchronisation terminée en {{time}}s",
    	"sync.conflict": "Des conflits sont survenus lors de la synchronisation.",
    	"rclone.error.logs": "Journaux d'erreur de synchronisation",
    	"resynchronizing.savedata": "Resynchronisation des données sauvegardées, veuillez patienter",
    	"log.files": "Fichiers journaux",
    	"app.logs": "Logs du plugin",
    	"sync.logs": "Logs de synchronisation",
    	"no.available.logs": "Aucun journal disponible",
    	"deleting.locks.sync": "Suppression des verrous et synchronisation",
    	"delete.locks": "Supprimer les verrous"
    };

    var sync$3 = "Sincronização";
    var configuration$3 = "Configuração";
    var file$3 = "Arquivo";
    var folder$3 = "Pasta";
    var includes$3 = "Inclusões";
    var excludes$3 = "Exclusões";
    var portuguese = {
    	sync: sync$3,
    	"sync.now": "Sincronizar Agora",
    	"resync.now": "Resincronizar Agora",
    	"provider.not.configured": "O provedor de armazenamento em nuvem não está configurado. Por favor, configure-o em 'Provedor de Nuvem'",
    	"sync.start.stop": "Sincronizar no início e no término do jogo",
    	"toast.auto.sync": "Mensagem após sincronização automática",
    	configuration: configuration$3,
    	"sync.paths": "Caminhos de Sincronização",
    	"cloud.provider": "Provedor de Nuvem",
    	"experimental.use.risk": "Uso Experimental POR SUA CONTA E RISCO",
    	"bidirectional.sync": "Sincronização Bidirecional",
    	"you.mad": "Você está louco??",
    	"warning.root": "Para sua própria segurança, a capacidade de sincronizar todo o sistema de arquivos está desativada",
    	"confirm.add": "Confirmar Adição",
    	"confirm.add.path": "O caminho {{path}} corresponde a {{count}} arquivo(s). Prosseguir?",
    	"select.path": "Selecionar Caminho para Sincronização",
    	file: file$3,
    	folder: folder$3,
    	"folder.exclude": "Pasta (excluir subpastas)",
    	"add.to.sync": "Adicionar Caminho para Sincronização",
    	"exclude.from.sync": "Excluir Caminho da Sincronização",
    	"confirm.remove": "Confirmar Remoção",
    	"removing.path": "Removendo Caminho {{path}}. Prosseguir?",
    	"includes.vs.exclude": "Inclusões vs Exclusões",
    	"help.exclude": "A partir da versão 1.2.0, é possível excluir determinadas pastas da sincronização.\n\nDurante a sincronização, o plugin primeiro verifica a lista de exclusões para ver se um arquivo (ou pasta) não está excluído e só então verifica os arquivos na lista de inclusões.\n\nPor exemplo, se a pasta /a/** estiver incluída, mas o arquivo /a/b estiver excluído, todos os arquivos exceto b serão salvos.",
    	"include.or.exclude.subf": "Incluir ou excluir subpastas",
    	"help.include.or.exclude.subf": "Pode haver casos em que seja necessário fazer backup apenas de uma pasta sem pesquisar recursivamente nas subpastas. Para esses casos, você pode usar a opção 'Pasta (excluir subpastas)'.\n\nEsses casos são bastante específicos; em geral, a opção 'Pasta' deve ser usada.",
    	"bug.file.picker": "Erro: Seletor de Arquivos carrega indefinidamente",
    	"help.file.picker.fail": "Após uma nova instalação, o seletor de arquivos às vezes falha ao carregar. Reiniciar o Steam corrige isso.\nVeja mais detalhes na discussão",
    	"cloud.save.path": "Caminho de Salvamento na Nuvem",
    	"configure.provider": "Configurar Provedor de Armazenamento em Nuvem",
    	"currently.using": "Atualmente em uso",
    	"click.providers": "Clique no botão abaixo para configurar o Nutstore (WebDAV) como destino de backup.",
    	includes: includes$3,
    	excludes: excludes$3,
    	"waiting.previous": "Aguardando sincronização anterior",
    	"synchronizing.savedata": "Sincronizando dados salvos",
    	"sync.failed": "Erro. Clique aqui para ver os erros.",
    	"sync.completed": "Sincronização concluída em {{time}}s",
    	"sync.conflict": "Ocorreram conflitos durante a sincronização.",
    	"rclone.error.logs": "Logs de erro de sincronização",
    	"resynchronizing.savedata": "Re-sincronizando dados salvos, por favor aguarde",
    	"log.files": "Arquivos de log",
    	"app.logs": "Logs do plugin",
    	"sync.logs": "Logs de sincronização",
    	"no.available.logs": "Nenhum registro disponível",
    	"deleting.locks.sync": "Excluindo bloqueios e sincronizando",
    	"delete.locks": "Excluir bloqueios"
    };

    var sync$2 = "Synchronisierung";
    var configuration$2 = "Konfiguration";
    var file$2 = "Datei";
    var folder$2 = "Ordner";
    var includes$2 = "Einschlüsse";
    var excludes$2 = "Ausschlüsse";
    var german = {
    	sync: sync$2,
    	"sync.now": "Jetzt synchronisieren",
    	"resync.now": "Jetzt neu synchronisieren",
    	"provider.not.configured": "Cloud-Speicheranbieter ist nicht konfiguriert. Bitte konfigurieren Sie ihn in 'Cloud-Anbieter'",
    	"sync.start.stop": "Synchronisieren beim Starten und Beenden des Spiels",
    	"toast.auto.sync": "Toast nach automatischer Synchronisierung",
    	configuration: configuration$2,
    	"sync.paths": "Sync-Pfade",
    	"cloud.provider": "Cloud-Anbieter",
    	"experimental.use.risk": "Experimentelle NUTZUNG AUF EIGENES RISIKO",
    	"bidirectional.sync": "Bidirektionale Synchronisierung",
    	"you.mad": "Bist du verrückt??",
    	"warning.root": "Zu Ihrer eigenen Sicherheit ist die Fähigkeit, das gesamte Dateisystem zu synchronisieren, deaktiviert",
    	"confirm.add": "Hinzufügen bestätigen",
    	"confirm.add.path": "Der Pfad {{path}} passt zu {{count}} Datei(en). Fortfahren?",
    	"select.path": "Pfad zur Synchronisierung auswählen",
    	file: file$2,
    	folder: folder$2,
    	"folder.exclude": "Ordner (Unterordner ausschließen)",
    	"add.to.sync": "Pfad zur Synchronisierung hinzufügen",
    	"exclude.from.sync": "Pfad von der Synchronisierung ausschließen",
    	"confirm.remove": "Entfernen bestätigen",
    	"removing.path": "Entfernen des Pfads {{path}}. Fortfahren?",
    	"includes.vs.exclude": "Einschließen vs. Ausschließen",
    	"help.exclude": "Ab Version 1.2.0 ist es möglich, bestimmte Ordner von der Synchronisierung auszuschließen.\n\nWährend der Synchronisierung überprüft das Plugin zuerst die Liste der Ausschlüsse, um zu sehen, ob eine Datei (oder ein Ordner) nicht ausgeschlossen ist, und prüft dann erst die Dateien in der Liste der Einschlüsse.\n\nWenn beispielsweise der Ordner /a/** eingeschlossen ist, aber die Datei /a/b ausgeschlossen ist, würden alle Dateien außer b gesichert.",
    	"include.or.exclude.subf": "Unterordner einschließen oder ausschließen",
    	"help.include.or.exclude.subf": "Es kann Fälle geben, in denen es notwendig ist, nur einen Ordner ohne rekursives Durchsuchen von Unterordnern zu sichern. Für diese Fälle können Sie die Option 'Ordner (Unterordner ausschließen)' verwenden.\n\nSolche Fälle sind recht speziell; im Allgemeinen sollte stattdessen die Option 'Ordner' verwendet werden.",
    	"bug.file.picker": "Fehler: Dateiauswahl lädt endlos",
    	"help.file.picker.fail": "Nach einer Neuinstallation lädt die Dateiauswahl manchmal endlos. Ein Neustart von Steam behebt dies.\nWeitere Details finden Sie in der Diskussion",
    	"cloud.save.path": "Cloud-Speicherpfad",
    	"configure.provider": "Cloud-Speicheranbieter konfigurieren",
    	"currently.using": "Aktuell in Benutzung",
    	"click.providers": "Klicken Sie unten auf den Button, um Nutstore (WebDAV) als Backup-Ziel zu konfigurieren.",
    	includes: includes$2,
    	excludes: excludes$2,
    	"waiting.previous": "Warten auf vorherige Synchronisierung",
    	"synchronizing.savedata": "Speicherd",
    	"sync.failed": "Fehler. Klicken Sie hier, um die Fehler anzuzeigen.",
    	"sync.completed": "Synchronisierung abgeschlossen in {{time}}s",
    	"sync.conflict": "Während der Synchronisierung traten Konflikte auf.",
    	"rclone.error.logs": "Fehler-Synchronisierungsprotokolle",
    	"resynchronizing.savedata": "Speicherd",
    	"log.files": "Protokolldateien",
    	"app.logs": "Plugin-Protokolle",
    	"sync.logs": "Sync-Protokolle",
    	"no.available.logs": "Keine verfügbaren Protokolle",
    	"deleting.locks.sync": "Löschen von Sperren und Synchronisieren",
    	"delete.locks": "Sperren löschen"
    };

    var sync$1 = "同步";
    var configuration$1 = "配置";
    var file$1 = "檔案";
    var folder$1 = "資料夾";
    var includes$1 = "包含";
    var excludes$1 = "排除";
    var chinese = {
    	sync: sync$1,
    	"sync.now": "立即同步",
    	"sync.upload": "SD → 雲端（上傳存檔）",
    	"sync.download": "雲端 → SD（下載存檔）",
    	"resync.now": "立即重新同步",
    	"provider.not.configured": "未配置雲存儲提供商。請在「雲存儲提供商」中配置",
    	"sync.start.stop": "在遊戲開始和結束時同步",
    	"toast.auto.sync": "自動同步後彈出通知",
    	configuration: configuration$1,
    	"sync.paths": "同步路徑",
    	"cloud.provider": "雲存儲提供商",
    	"experimental.use.risk": "實驗性功能",
    	"bidirectional.sync": "双向同步",
    	"you.mad": "你瘋了嗎？？",
    	"warning.root": "為了你的個人安全，你無法同步整個檔案系統",
    	"confirm.add": "確認添加",
    	"confirm.add.path": "路徑 {{path}} 對應 {{count}} 個檔案。繼續？",
    	"select.path": "選擇要同步的路徑",
    	file: file$1,
    	folder: folder$1,
    	"folder.exclude": "資料夾 (排除子資料夾)",
    	"add.to.sync": "將路徑添加到同步",
    	"exclude.from.sync": "將路徑從同步中排除",
    	"confirm.remove": "確認移除",
    	"removing.path": "移除路徑 {{path}}。繼續？",
    	"includes.vs.exclude": "包含或排除",
    	"help.exclude": "自 v1.2.0 起, 特定資料夾可被從同步中排除。\n\n同步時，本插件會先檢查排除列表以確認某檔案（或資料夾）是否被排除，其後它才會檢查包含列表內的文件。\n\n舉例，若資料夾 /a/** 在包含列表內, 但檔案 /a/b 在排除列表內，則除 b 以外的檔案將會被備份。",
    	"include.or.exclude.subf": "包含或排除子資料夾",
    	"help.include.or.exclude.subf": "有時插件只需要備份資料夾本身而不需要繼續搜尋子資料夾。在這種情況下，你可以使用「資料夾 (排除子資料夾)」選項。\n\n此種情況十分罕見，多數時期應使用「資料夾」選項。",
    	"bug.file.picker": "臭蟲：檔案選擇器無限期載入",
    	"help.file.picker.fail": "全新安裝後，檔案選擇器可能無法載入。重新啟動 Steam 即可解決。\n詳情請參考討論區",
    	"cloud.save.path": "堅果雲存放目錄（留空則直接上傳到根目錄）",
    	"configure.provider": "配置雲存儲提供商",
    	"currently.using": "使用中",
    	"click.providers": "點擊下方按鈕，將堅果雲（WebDAV）配置為備份目標。",
    	includes: includes$1,
    	excludes: excludes$1,
    	"waiting.previous": "正等待前一次同步",
    	"synchronizing.savedata": "同步儲存資料（savedata）",
    	"sync.failed": "出錯。點擊此處以查看該錯誤。",
    	"sync.completed": "同步完成，共耗時 {{time}} 秒",
    	"sync.conflict": "同步時遭遇衝突。",
    	"rclone.error.logs": "日誌同步出錯",
    	"resynchronizing.savedata": "重新同步儲存資料（savedata），請稍候",
    	"log.files": "日誌檔案",
    	"app.logs": "插件日誌",
    	"sync.logs": "同步日誌",
    	"no.available.logs": "無可用日誌",
    	"deleting.locks.sync": "刪除鎖定並同步",
    	"delete.locks": "刪除鎖定檔案（locks）",
    	"nutstore.backend": "堅果雲 WebDAV",
    	"nutstore.title": "堅果雲（WebDAV）",
    	"nutstore.desc": "使用堅果雲的 WebDAV 服務同步遊戲存檔，國內訪問穩定、速度快，無需科學上網。",
    	"nutstore.url": "WebDAV 地址",
    	"nutstore.account": "堅果雲帳號（郵箱）",
    	"nutstore.password": "應用專用密碼",
    	"nutstore.configuring": "正在配置堅果雲 WebDAV……",
    	"nutstore.success": "配置成功！已切換到堅果雲 WebDAV。",
    	"nutstore.fail": "配置失敗",
    	"nutstore.hint": "注意：應用專用密碼不是登錄密碼。請先在堅果雲網頁端的「安全選項 → 第三方應用管理」中生成一個應用專用密碼，再填到此處。",
    	"nutstore.save": "保存並配置",
    	"nutstore.cancel": "取消"
    };

    var sync = "同步";
    var configuration = "配置";
    var file = "文件";
    var folder = "文件夹";
    var includes = "包含";
    var excludes = "排除";
    var chineseSimplified = {
    	sync: sync,
    	"sync.now": "立即同步",
    	"sync.upload": "SD → 云端（上传存档）",
    	"sync.download": "云端 → SD（下载存档）",
    	"resync.now": "立即重新同步",
    	"provider.not.configured": "未配置云存储服务商，请在“云存储”中配置",
    	"sync.start.stop": "在游戏启动和退出时同步",
    	"toast.auto.sync": "自动同步后弹出通知",
    	configuration: configuration,
    	"sync.paths": "同步路径",
    	"cloud.provider": "云存储服务商",
    	"experimental.use.risk": "实验性功能",
    	"bidirectional.sync": "双向同步",
    	"you.mad": "你疯了吗？？",
    	"warning.root": "为了您的安全，已禁用同步整个文件系统的功能",
    	"confirm.add": "确认添加",
    	"confirm.add.path": "路径 {{path}} 匹配 {{count}} 个文件，是否继续？",
    	"select.path": "选择要同步的路径",
    	file: file,
    	folder: folder,
    	"folder.exclude": "文件夹（排除子文件夹）",
    	"add.to.sync": "添加到同步",
    	"exclude.from.sync": "从同步中排除",
    	"confirm.remove": "确认移除",
    	"removing.path": "正在移除路径 {{path}}，是否继续？",
    	"includes.vs.exclude": "包含与排除",
    	"help.exclude": "自 v1.2.0 起，可以将某些文件夹从同步中排除。\n\n同步时，插件会先检查排除列表，确认某个文件（或文件夹）是否未被排除，之后才会去包含列表中查找需要备份的文件。\n\n举例：如果文件夹 /a/** 在包含列表中，但文件 /a/b 在排除列表中，那么除 b 以外的所有文件都会被备份。",
    	"include.or.exclude.subf": "包含或排除子文件夹",
    	"help.include.or.exclude.subf": "有时我们只需要备份某个文件夹本身，而不需要继续深入其下的子文件夹。这种情况下可以使用“文件夹（排除子文件夹）”选项。\n\n这类情况比较少见，一般情况下应使用“文件夹”选项。",
    	"bug.file.picker": "已知问题：文件选择器无限加载",
    	"help.file.picker.fail": "全新安装后，文件选择器有时无法加载，重启 Steam 即可解决。\n详情请参考讨论区。",
    	"cloud.save.path": "坚果云存放目录（留空则直接上传到根目录）",
    	"configure.provider": "配置云存储服务商",
    	"currently.using": "当前使用",
    	"click.providers": "点击下方按钮，将坚果云（WebDAV）配置为备份目标。",
    	includes: includes,
    	excludes: excludes,
    	"waiting.previous": "正在等待上一次同步",
    	"synchronizing.savedata": "正在同步存档数据",
    	"sync.failed": "出错，点击此处查看错误。",
    	"sync.completed": "同步完成，耗时 {{time}} 秒",
    	"sync.conflict": "同步时发生冲突。",
    	"rclone.error.logs": "同步日志出错",
    	"resynchronizing.savedata": "正在重新同步存档数据，请稍候",
    	"log.files": "日志文件",
    	"app.logs": "插件日志",
    	"sync.logs": "同步日志",
    	"no.available.logs": "无可用日志",
    	"deleting.locks.sync": "删除锁定并同步",
    	"delete.locks": "删除锁定文件",
    	"nutstore.backend": "坚果云 WebDAV",
    	"nutstore.title": "坚果云（WebDAV）",
    	"nutstore.desc": "使用坚果云的 WebDAV 服务同步游戏存档，国内访问稳定、速度快，无需科学上网。",
    	"nutstore.url": "WebDAV 地址",
    	"nutstore.account": "坚果云账号（邮箱）",
    	"nutstore.password": "应用专用密码",
    	"nutstore.configuring": "正在配置坚果云 WebDAV……",
    	"nutstore.success": "配置成功！已切换到坚果云 WebDAV。",
    	"nutstore.fail": "配置失败",
    	"nutstore.hint": "注意：应用专用密码不是登录密码。请先在坚果云网页端的「安全选项 → 第三方应用管理」中生成一个应用专用密码，再填到此处。",
    	"nutstore.save": "保存并配置",
    	"nutstore.cancel": "取消"
    };

    /**
     * Represents supported languages.
     */
    var Language;
    (function (Language) {
        Language[Language["english"] = 0] = "english";
        Language[Language["spanish"] = 1] = "spanish";
        Language[Language["latam"] = 2] = "latam";
        Language[Language["french"] = 3] = "french";
        Language[Language["portuguese"] = 4] = "portuguese";
        Language[Language["german"] = 5] = "german";
        Language[Language["chinese"] = 6] = "chinese";
        Language[Language["schinese"] = 7] = "schinese";
        Language[Language["tchinese"] = 8] = "tchinese";
    })(Language || (Language = {}));
    /**
     * The Translator class is used to translate text into different languages.
     */
    class Translator {
        /**
         * Private constructor to prevent instantiation
         */
        constructor() {
        }
        /**
         * Method to set up the translator. It retrieves the current language from the SteamClient.Settings,
         * logs the language, and sets the currDictionary to the dictionary of the current language.
         * If the current language is not English and no translation is available, it falls back to English.
         */
        static async initialize() {
            let currLang = await SteamClient.Settings.GetCurrentLanguage();
            Logger.debug("Initializing translator for " + currLang);
            const langKey = currLang.toLowerCase();
            const lang = Language[langKey] || Language.english;
            if (currLang != "english" && lang == Language.english) {
                Logger.warn("No translator available, fallback to English");
            }
            else {
                Translator.currDictionary = { ...Translator.currDictionary, ...Translator.allDictionaries[lang] };
            }
        }
        /**
         * Method to translate a given text into the current language.
         * @param text - The text to translate
         * @param replacements - An object that contains key-value pairs to replace in the text
         * @returns The translated text. If a translation for a text is not found in the current dictionary, the original text is returned.
         */
        static translate(text, replacements = {}) {
            let result = Translator.currDictionary[text] || text;
            if (result == text) {
                Logger.warn("Missing translation for " + text);
            }
            else {
                for (const key in replacements) {
                    const placeholder = `{{${key}}}`;
                    result = result.split(placeholder).join(replacements[key]);
                }
            }
            return result;
        }
    }
    /**
     * An object that maps languages to their respective dictionaries.
     */
    Translator.allDictionaries = {
        [Language.english]: english,
        [Language.spanish]: spanish,
        [Language.latam]: spanish,
        [Language.french]: french,
        [Language.portuguese]: portuguese,
        [Language.german]: german,
        [Language.chinese]: chinese,
        [Language.schinese]: chineseSimplified,
        [Language.tchinese]: chinese
    };
    /**
     * The dictionary of the current language.
     */
    Translator.currDictionary = { ...Translator.allDictionaries[Language.english] };

    var Action;
    (function (Action) {
        Action[Action["REMOVE"] = 0] = "REMOVE";
        Action[Action["CREATED"] = 1] = "CREATED";
        Action[Action["MODIFIED"] = 2] = "MODIFIED";
    })(Action || (Action = {}));
    class Storage {
        constructor() {
        }
        /**
         * Sets a session storage item.
         * @param key - The key for the item.
         * @param value - The value to set.
         */
        static setSessionStorageItem(key, value) {
            const prevVal = this.getSessionStorageItem(key);
            const prefixedKey = Storage.SESSION_STORAGE_PREFIX + key;
            sessionStorage.setItem(prefixedKey, value);
            Storage.sessionStorageVariablesSet.add(prefixedKey);
            let action = null;
            if (prevVal == null) {
                action = Action.CREATED;
            }
            else if (prevVal != value) {
                action = Action.MODIFIED;
            }
            if (action != null) {
                Storage.invokeSubscribers(key, action);
            }
        }
        /**
         * Gets a session storage item.
         * @param key - The key for the item.
         * @returns The value of the item, or null if not found.
         */
        static getSessionStorageItem(key) {
            const prefixedKey = Storage.SESSION_STORAGE_PREFIX + key;
            const item = sessionStorage.getItem(prefixedKey);
            return item ? item : null;
        }
        /**
         * Gets a session storage item.
         * @param key - The key for the item.
         * @param defValue - Default value
         * @returns The value of the item, or null if not found.
         */
        static getSessionStorageItemOrDefault(key, defValue) {
            const item = Storage.getSessionStorageItem(key);
            return item ? item : defValue;
        }
        /**
         * Removes a session storage item.
         * @param key - The key for the item.
         */
        static removeSessionStorageItem(key) {
            const prefixedKey = Storage.SESSION_STORAGE_PREFIX + key;
            sessionStorage.removeItem(prefixedKey);
            Storage.sessionStorageVariablesSet.delete(prefixedKey);
            Storage.invokeSubscribers(key, Action.REMOVE);
        }
        /**
         * Clears all session storage items.
         */
        static clearAllSessionStorage() {
            for (const key of Storage.sessionStorageVariablesSet) {
                sessionStorage.removeItem(key);
                Storage.invokeSubscribers(key, Action.REMOVE);
            }
            Storage.sessionStorageVariablesSet.clear();
            Storage.subscribers = [];
        }
        static subscribe(key, callback) {
            const id = new Date().getTime();
            Storage.subscribers.push({ key, id, callback });
            return id;
        }
        ;
        static invokeSubscribers(key, action) {
            Storage.subscribers.forEach((e) => { if (e.key == key) {
                e.callback(action, Storage.getSessionStorageItem(key));
            } });
        }
    }
    Storage.subscribers = [];
    /**
     * Prefix for session storage keys.
     */
    Storage.SESSION_STORAGE_PREFIX = 'dcs_';
    /**
     * Set to keep track of session storage variables.
     */
    Storage.sessionStorageVariablesSet = new Set();
    Storage.unsubscribe = (id) => {
        const index = Storage.subscribers.findIndex((f) => f.id === id);
        if (index > -1) {
            Storage.subscribers.splice(index, 1);
        }
    };

    /**
     * Represents an API client for handling synchronization.
     */
    class ApiClient {
        /**
         * Delete lock files and re-synchronize (upload direction).
         */
        static async deleteLocksAndResync() {
            await Backend.deleteLockFiles();
            await this.resyncNow();
        }
        /**
         * Constructs a new instance of the ApiClient class.
         * @private
         */
        constructor() { }
        /**
         * Synchronizes data immediately in the given direction.
         * @param showToast - Whether to show toast notifications.
         * @param direction - 'upload' (SD -> cloud) or 'download' (cloud -> SD).
         * @returns A Promise that resolves when synchronization is complete.
         */
        static async syncNow(showToast, direction = "upload") {
            return ApiClient.syncNowInternal(showToast, direction);
        }
        /**
         * Forces a full re-synchronization.
         * @returns A Promise that resolves when synchronization is complete.
         */
        static async resyncNow() {
            return ApiClient.syncNowInternal(true, "upload");
        }
        /**
         * Synchronizes data on application launch (pull latest saves from the cloud
         * before playing).
         * @param showToast - Whether to show toast notifications.
         * @param pid - The process ID.
         * @returns A Promise that resolves when synchronization is complete.
         */
        static async syncOnLaunch(showToast, pid) {
            Logger.info("Pausing game");
            await Backend.signal(pid, 'SIGSTOP');
            await ApiClient.syncNowInternal(showToast, "download");
            Logger.info("Resuming game");
            await Backend.signal(pid, 'SIGCONT');
        }
        /**
         * Synchronizes data on application end (push local saves to the cloud).
         * @param showToast - Whether to show toast notifications.
         * @returns A Promise that resolves when synchronization is complete.
         */
        static async syncOnEnd(showToast) {
            return ApiClient.syncNowInternal(showToast, "upload");
        }
        /**
         * Retrieves the cloud backend type.
         * @returns A string representing the cloud backend type.
         */
        static async getCloudBackend() {
            const e = await ApplicationState.getServerApi().callPluginMethod("get_backend_type", {});
            if (e.success) {
                switch (e.result) {
                    case "type = webdav\n":
                        return Translator.translate("nutstore.backend");
                    case undefined:
                        return undefined;
                    default:
                        return "Other: " + e.result;
                }
            }
            else {
                return undefined;
            }
        }
        /**
         * Retrieves synchronization paths.
         * @param file - The type of file.
         * @returns An array of synchronization paths.
         */
        static async getSyncPaths(file) {
            return ApplicationState.getServerApi()
                .callPluginMethod("get_syncpaths", { file })
                .then((r) => {
                if (r.success) {
                    if (r.result.length === 0) {
                        return [];
                    }
                    r.result.sort();
                    while (r.result[0] === "\n") {
                        r.result = r.result.slice(1);
                    }
                    return r.result.map((r) => r.trimEnd());
                }
                else {
                    Toast.toast(r.result);
                    return [];
                }
            });
        }
        /**
         * Internal method for synchronizing data.
         * @param showToast - Whether to show toast notifications.
         * @param direction - 'upload' (SD -> cloud) or 'download' (cloud -> SD).
         * @param resync - Whether to force a full resync.
         * @returns A Promise that resolves when synchronization is complete.
         */
        static async syncNowInternal(showToast, direction, resync = false) {
            Logger.info("Synchronizing");
            const start = new Date();
            if (ApplicationState.getAppState().currentState.syncing === "true") {
                Toast.toast(Translator.translate("waiting.previous"), 2000);
                while (ApplicationState.getAppState().currentState.syncing === "true") {
                    await deckyFrontendLib.sleep(300);
                }
            }
            Storage.setSessionStorageItem("syncing", "true");
            ApplicationState.setAppState("syncing", "true");
            await ApplicationState.getServerApi().callPluginMethod("sync_now_internal", { direction, resync });
            let exitCode = 0;
            while (true) {
                const status = await ApplicationState.getServerApi().callPluginMethod("sync_now_probe", {});
                if (status.success && status.result != null) {
                    exitCode = status.result;
                    break;
                }
                await deckyFrontendLib.sleep(360);
            }
            const timeDiff = ((new Date().getTime() - start.getTime()) / 1000);
            Logger.info("Sync finished in " + timeDiff + "s");
            let pass;
            switch (exitCode) {
                case 0:
                case 6:
                    pass = true;
                    break;
                default:
                    pass = false;
                    break;
            }
            ApplicationState.setAppState("syncing", "false");
            Storage.setSessionStorageItem("syncing", "false");
            let body;
            let time = 2000;
            let action = () => { deckyFrontendLib.Navigation.Navigate("/dcs-sync-logs"); };
            const syncLogs = await Backend.getLastSyncLog();
            Storage.setSessionStorageItem("syncLogs", syncLogs);
            if (pass) {
                body = Translator.translate("sync.completed", { "time": timeDiff });
            }
            else {
                body = Translator.translate("sync.failed");
                time = 15000;
            }
            if (showToast || (!pass)) {
                Toast.toast(body, time, action);
            }
            // Additional check for if there were any conflicts.
            if (syncLogs.match(/Moved \(server-side\) to: .*\.conflict\d*/)) {
                Toast.toast(Translator.translate("sync.conflict"), 5000, () => { deckyFrontendLib.Navigation.Navigate("/dcs-sync-logs"); });
            }
        }
    }

    var DefaultContext = {
      color: undefined,
      size: undefined,
      className: undefined,
      style: undefined,
      attr: undefined
    };
    var IconContext = React__default["default"].createContext && React__default["default"].createContext(DefaultContext);

    var __assign = window && window.__assign || function () {
      __assign = Object.assign || function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
      return __assign.apply(this, arguments);
    };
    var __rest = window && window.__rest || function (s, e) {
      var t = {};
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
      if (s != null && typeof Object.getOwnPropertySymbols === "function") for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
        if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
      }
      return t;
    };
    function Tree2Element(tree) {
      return tree && tree.map(function (node, i) {
        return React__default["default"].createElement(node.tag, __assign({
          key: i
        }, node.attr), Tree2Element(node.child));
      });
    }
    function GenIcon(data) {
      // eslint-disable-next-line react/display-name
      return function (props) {
        return React__default["default"].createElement(IconBase, __assign({
          attr: __assign({}, data.attr)
        }, props), Tree2Element(data.child));
      };
    }
    function IconBase(props) {
      var elem = function (conf) {
        var attr = props.attr,
          size = props.size,
          title = props.title,
          svgProps = __rest(props, ["attr", "size", "title"]);
        var computedSize = size || conf.size || "1em";
        var className;
        if (conf.className) className = conf.className;
        if (props.className) className = (className ? className + " " : "") + props.className;
        return React__default["default"].createElement("svg", __assign({
          stroke: "currentColor",
          fill: "currentColor",
          strokeWidth: "0"
        }, conf.attr, attr, svgProps, {
          className: className,
          style: __assign(__assign({
            color: props.color || conf.color
          }, conf.style), props.style),
          height: computedSize,
          width: computedSize,
          xmlns: "http://www.w3.org/2000/svg"
        }), title && React__default["default"].createElement("title", null, title), props.children);
      };
      return IconContext !== undefined ? React__default["default"].createElement(IconContext.Consumer, null, function (conf) {
        return elem(conf);
      }) : elem(DefaultContext);
    }

    // THIS FILE IS AUTO GENERATED
    function FaCloudUploadAlt (props) {
      return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 640 512"},"child":[{"tag":"path","attr":{"d":"M537.6 226.6c4.1-10.7 6.4-22.4 6.4-34.6 0-53-43-96-96-96-19.7 0-38.1 6-53.3 16.2C367 64.2 315.3 32 256 32c-88.4 0-160 71.6-160 160 0 2.7.1 5.4.2 8.1C40.2 219.8 0 273.2 0 336c0 79.5 64.5 144 144 144h368c70.7 0 128-57.3 128-128 0-61.9-44-113.6-102.4-125.4zM393.4 288H328v112c0 8.8-7.2 16-16 16h-48c-8.8 0-16-7.2-16-16V288h-65.4c-14.3 0-21.4-17.2-11.3-27.3l105.4-105.4c6.2-6.2 16.4-6.2 22.6 0l105.4 105.4c10.1 10.1 2.9 27.3-11.3 27.3z"}}]})(props);
    }function FaFile (props) {
      return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 384 512"},"child":[{"tag":"path","attr":{"d":"M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm160-14.1v6.1H256V0h6.1c6.4 0 12.5 2.5 17 7l97.9 98c4.5 4.5 7 10.6 7 16.9z"}}]})(props);
    }function FaFolder (props) {
      return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 512 512"},"child":[{"tag":"path","attr":{"d":"M464 128H272l-64-64H48C21.49 64 0 85.49 0 112v288c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V176c0-26.51-21.49-48-48-48z"}}]})(props);
    }function FaPlug (props) {
      return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 384 512"},"child":[{"tag":"path","attr":{"d":"M320,32a32,32,0,0,0-64,0v96h64Zm48,128H16A16,16,0,0,0,0,176v32a16,16,0,0,0,16,16H32v32A160.07,160.07,0,0,0,160,412.8V512h64V412.8A160.07,160.07,0,0,0,352,256V224h16a16,16,0,0,0,16-16V176A16,16,0,0,0,368,160ZM128,32a32,32,0,0,0-64,0v96h64Z"}}]})(props);
    }function FaSave (props) {
      return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 448 512"},"child":[{"tag":"path","attr":{"d":"M433.941 129.941l-83.882-83.882A48 48 0 0 0 316.118 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V163.882a48 48 0 0 0-14.059-33.941zM224 416c-35.346 0-64-28.654-64-64 0-35.346 28.654-64 64-64s64 28.654 64 64c0 35.346-28.654 64-64 64zm96-304.52V212c0 6.627-5.373 12-12 12H76c-6.627 0-12-5.373-12-12V108c0-6.627 5.373-12 12-12h228.52c3.183 0 6.235 1.264 8.485 3.515l3.48 3.48A11.996 11.996 0 0 1 320 111.48z"}}]})(props);
    }function FaTrash (props) {
      return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 448 512"},"child":[{"tag":"path","attr":{"d":"M432 32H312l-9.4-18.7A24 24 0 0 0 281.1 0H166.8a23.72 23.72 0 0 0-21.4 13.3L136 32H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16zM53.2 467a48 48 0 0 0 47.9 45h245.8a48 48 0 0 0 47.9-45L416 128H32z"}}]})(props);
    }

    // THIS FILE IS AUTO GENERATED
    function FiEdit3 (props) {
      return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round"},"child":[{"tag":"path","attr":{"d":"M12 20h9"}},{"tag":"path","attr":{"d":"M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"}}]})(props);
    }

    // THIS FILE IS AUTO GENERATED
    function AiOutlineCloudUpload (props) {
      return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 1024 1024"},"child":[{"tag":"path","attr":{"d":"M518.3 459a8 8 0 0 0-12.6 0l-112 141.7a7.98 7.98 0 0 0 6.3 12.9h73.9V856c0 4.4 3.6 8 8 8h60c4.4 0 8-3.6 8-8V613.7H624c6.7 0 10.4-7.7 6.3-12.9L518.3 459z"}},{"tag":"path","attr":{"d":"M811.4 366.7C765.6 245.9 648.9 160 512.2 160S258.8 245.8 213 366.6C127.3 389.1 64 467.2 64 560c0 110.5 89.5 200 199.9 200H304c4.4 0 8-3.6 8-8v-60c0-4.4-3.6-8-8-8h-40.1c-33.7 0-65.4-13.4-89-37.7-23.5-24.2-36-56.8-34.9-90.6.9-26.4 9.9-51.2 26.2-72.1 16.7-21.3 40.1-36.8 66.1-43.7l37.9-9.9 13.9-36.6c8.6-22.8 20.6-44.1 35.7-63.4a245.6 245.6 0 0 1 52.4-49.9c41.1-28.9 89.5-44.2 140-44.2s98.9 15.3 140 44.2c19.9 14 37.5 30.8 52.4 49.9 15.1 19.3 27.1 40.7 35.7 63.4l13.8 36.5 37.8 10C846.1 454.5 884 503.8 884 560c0 33.1-12.9 64.3-36.3 87.7a123.07 123.07 0 0 1-87.6 36.3H720c-4.4 0-8 3.6-8 8v60c0 4.4 3.6 8 8 8h40.1C870.5 760 960 670.5 960 560c0-92.7-63.1-170.7-148.6-193.3z"}}]})(props);
    }

    function Head() {
        return (window.SP_REACT.createElement(window.SP_REACT.Fragment, null,
            window.SP_REACT.createElement("style", null, `
      .dcs-rotate {
        animation: dcsrotate 1s infinite cubic-bezier(0.46, 0.03, 0.52, 0.96);
      }

      @keyframes dcsrotate {
        from {
          transform: rotate(0deg);
        }

        to {
          transform: rotate(359deg);
        }
      }
    `)));
    }

    function DeckyStoreButton({ icon, children }) {
        return (window.SP_REACT.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
            icon,
            window.SP_REACT.createElement("div", null, children)));
    }

    // TODO
    const Content = () => {
        const appState = ApplicationState.useAppState();
        const [hasProvider, setHasProvider] = React.useState(undefined);
        React.useEffect(() => {
            ApiClient.getCloudBackend().then((e) => setHasProvider(!!e));
        }, []);
        return (window.SP_REACT.createElement(window.SP_REACT.Fragment, null,
            window.SP_REACT.createElement(Head, null),
            window.SP_REACT.createElement(deckyFrontendLib.PanelSection, { title: Translator.translate("sync") },
                window.SP_REACT.createElement(deckyFrontendLib.PanelSectionRow, null,
                    window.SP_REACT.createElement(deckyFrontendLib.ButtonItem, { layout: "below", disabled: appState.syncing === "true" || !hasProvider, onClick: () => {
                            ApiClient.syncNow(true, "upload");
                        } },
                        window.SP_REACT.createElement(DeckyStoreButton, { icon: window.SP_REACT.createElement(FaSave, { className: appState.syncing === "true" ? "dcs-rotate" : "" }) }, Translator.translate("sync.upload")))),
                window.SP_REACT.createElement(deckyFrontendLib.PanelSectionRow, null,
                    window.SP_REACT.createElement(deckyFrontendLib.ButtonItem, { layout: "below", disabled: appState.syncing === "true" || !hasProvider, onClick: () => {
                            ApiClient.syncNow(true, "download");
                        } },
                        window.SP_REACT.createElement(DeckyStoreButton, { icon: window.SP_REACT.createElement(FaCloudUploadAlt, { className: appState.syncing === "true" ? "dcs-rotate" : "" }) }, Translator.translate("sync.download"))),
                    hasProvider === false && window.SP_REACT.createElement("small", null,
                        Translator.translate("provider.not.configured"),
                        "."))),
            window.SP_REACT.createElement(deckyFrontendLib.PanelSection, { title: Translator.translate("configuration") },
                window.SP_REACT.createElement(deckyFrontendLib.PanelSectionRow, null,
                    window.SP_REACT.createElement(deckyFrontendLib.ToggleField, { label: Translator.translate("sync.start.stop"), checked: appState.sync_on_game_exit === "true", onChange: (e) => ApplicationState.setAppState("sync_on_game_exit", e ? "true" : "false", true) })),
                window.SP_REACT.createElement(deckyFrontendLib.PanelSectionRow, null,
                    window.SP_REACT.createElement(deckyFrontendLib.ToggleField, { disabled: appState.sync_on_game_exit != "true", label: Translator.translate("toast.auto.sync"), checked: appState.toast_auto_sync === "true", onChange: (e) => ApplicationState.setAppState("toast_auto_sync", e ? "true" : "false", true) })),
                window.SP_REACT.createElement(deckyFrontendLib.PanelSectionRow, null,
                    window.SP_REACT.createElement(deckyFrontendLib.ButtonItem, { layout: "below", onClick: () => {
                            deckyFrontendLib.Navigation.CloseSideMenus();
                            deckyFrontendLib.Navigation.Navigate("/dcs-configure-paths");
                        } },
                        window.SP_REACT.createElement(DeckyStoreButton, { icon: window.SP_REACT.createElement(FiEdit3, null) }, Translator.translate("sync.paths")))),
                window.SP_REACT.createElement(deckyFrontendLib.PanelSectionRow, null,
                    window.SP_REACT.createElement(deckyFrontendLib.ButtonItem, { layout: "below", onClick: () => {
                            deckyFrontendLib.Navigation.CloseSideMenus();
                            deckyFrontendLib.Navigation.Navigate("/dcs-configure-backend");
                        } },
                        window.SP_REACT.createElement(DeckyStoreButton, { icon: window.SP_REACT.createElement(AiOutlineCloudUpload, null) }, Translator.translate("cloud.provider"))))),
            window.SP_REACT.createElement(deckyFrontendLib.PanelSection, { title: Translator.translate("log.files") },
                window.SP_REACT.createElement(deckyFrontendLib.PanelSectionRow, null,
                    window.SP_REACT.createElement(deckyFrontendLib.ButtonItem, { layout: "below", onClick: () => {
                            (async () => {
                                let logs = await Backend.getPluginLog();
                                if (logs == "" || logs == null || logs == undefined) {
                                    logs = Translator.translate("no.available.logs");
                                }
                                Storage.setSessionStorageItem("pluginLogs", logs);
                                deckyFrontendLib.Navigation.Navigate("/dcs-plugin-logs");
                                deckyFrontendLib.Navigation.CloseSideMenus();
                            })();
                        } },
                        window.SP_REACT.createElement(DeckyStoreButton, { icon: window.SP_REACT.createElement(FaPlug, null) }, Translator.translate("app.logs")))),
                window.SP_REACT.createElement(deckyFrontendLib.PanelSectionRow, null,
                    window.SP_REACT.createElement(deckyFrontendLib.ButtonItem, { layout: "below", disabled: appState.syncing === "true" || !hasProvider, onClick: () => {
                            (async () => {
                                let logs = await Backend.getLastSyncLog();
                                if (logs == "" || logs == null || logs == undefined) {
                                    logs = Translator.translate("no.available.logs");
                                }
                                Storage.setSessionStorageItem("syncLogs", logs);
                                deckyFrontendLib.Navigation.Navigate("/dcs-sync-logs");
                                deckyFrontendLib.Navigation.CloseSideMenus();
                            })();
                        } },
                        window.SP_REACT.createElement(DeckyStoreButton, { icon: window.SP_REACT.createElement(FaCloudUploadAlt, null) }, Translator.translate("sync.logs")))))));
    };

    function AddNewPathButton({ serverApi, onPathAdded, file }) {
        const [buttonDisabled, setButtonDisabled] = React.useState(false);
        const onFileChosen = (res, mode) => {
            if (res.realpath === "/") {
                deckyFrontendLib.showModal(window.SP_REACT.createElement(deckyFrontendLib.ConfirmModal, { strTitle: Translator.translate("you.mad"), strDescription: Translator.translate("warning.root") }));
                return;
            }
            setButtonDisabled(true);
            const path = mode === "directory" ? `${res.realpath}/**` : mode === "directory-norecurse" ? `${res.realpath}/*` : res.realpath;
            serverApi
                .callPluginMethod("test_syncpath", { path })
                .then((r) => {
                if (!r.success) {
                    Toast.toast(r.result);
                    setButtonDisabled(false);
                    return;
                }
                deckyFrontendLib.showModal(window.SP_REACT.createElement(deckyFrontendLib.ConfirmModal, { strTitle: Translator.translate("confirm.add"), strDescription: Translator.translate("confirm.add.path", { "path": path, "count": r.result }), onCancel: () => setButtonDisabled(false), onEscKeypress: () => setButtonDisabled(false), onOK: () => {
                        serverApi
                            .callPluginMethod("add_syncpath", { path, file })
                            .then(() => {
                            if (onPathAdded)
                                onPathAdded();
                        })
                            .catch((e) => Toast.toast(e))
                            .finally(() => setButtonDisabled(false));
                    } }));
            })
                .catch((e) => {
                Toast.toast(e);
                setButtonDisabled(false);
            });
        };
        return (window.SP_REACT.createElement(deckyFrontendLib.ButtonItem
        // icon={<FaPlus />}
        , { 
            // icon={<FaPlus />}
            layout: "below", onClick: () => deckyFrontendLib.showContextMenu(window.SP_REACT.createElement(deckyFrontendLib.Menu, { label: Translator.translate("select.path") },
                window.SP_REACT.createElement(deckyFrontendLib.MenuItem, { onSelected: () => serverApi
                        .openFilePicker("/home/deck", true)
                        .then((e) => onFileChosen(e, "file"))
                        .catch() }, Translator.translate("file")),
                window.SP_REACT.createElement(deckyFrontendLib.MenuItem, { onSelected: () => serverApi
                        .openFilePicker("/home/deck", false)
                        .then((e) => onFileChosen(e, "directory"))
                        .catch() }, Translator.translate("folder")),
                window.SP_REACT.createElement(deckyFrontendLib.MenuItem, { onSelected: () => serverApi
                        .openFilePicker("/home/deck", false)
                        .then((e) => onFileChosen(e, "directory-norecurse"))
                        .catch() }, Translator.translate("folder.exclude")))), disabled: buttonDisabled }, file === "includes" ? Translator.translate("add.to.sync") : Translator.translate("exclude.from.sync")));
    }

    function RenderExistingPathButton({ path, onPathRemoved, file, }) {
        const [buttonDisabled, setButtonDisabled] = React.useState(false);
        const onClickDelete = () => {
            deckyFrontendLib.showModal(window.SP_REACT.createElement(deckyFrontendLib.ConfirmModal, { strTitle: Translator.translate("confirm.remove"), strDescription: Translator.translate("removing.path", { "path": path }), onCancel: () => setButtonDisabled(false), onEscKeypress: () => setButtonDisabled(false), onOK: () => {
                    setButtonDisabled(true);
                    ApplicationState.getServerApi().callPluginMethod("remove_syncpath", { path, file }).then((res) => {
                        if (res.success) {
                            if (onPathRemoved)
                                onPathRemoved();
                        }
                        else {
                            Toast.toast(res.result);
                            setButtonDisabled(false);
                        }
                    });
                } }));
        };
        return (window.SP_REACT.createElement(deckyFrontendLib.ButtonItem, { icon: path.endsWith("**") ? window.SP_REACT.createElement(FaFolder, null) : window.SP_REACT.createElement(FaFile, null), label: path, onClick: onClickDelete, disabled: buttonDisabled },
            window.SP_REACT.createElement(FaTrash, null)));
    }

    function Container({ title, children, help }) {
        return (window.SP_REACT.createElement("div", { style: { margin: "1em", marginTop: "40px", overflow: "scroll", maxHeight: "calc(100% - 1em)" } },
            window.SP_REACT.createElement("h2", { style: { width: "100%", display: "flex", alignContent: "space-between" } },
                window.SP_REACT.createElement("span", null, title),
                window.SP_REACT.createElement("span", { style: { marginLeft: "auto" } }, help)),
            window.SP_REACT.createElement("div", null, children)));
    }

    function HelpAssistant({ entries }) {
        const openModal = (title, description, issueId) => {
            deckyFrontendLib.showModal(window.SP_REACT.createElement(deckyFrontendLib.ConfirmModal, { strTitle: title, strDescription: window.SP_REACT.createElement("span", { style: { whiteSpace: "pre-wrap" } }, description), bOKDisabled: !issueId, strOKButtonText: "\u67E5\u770B\u8BE6\u60C5", strCancelButtonText: "\u5173\u95ED", onOK: () => deckyFrontendLib.Navigation.NavigateToExternalWeb(`https://github.com/jmac1990cn/decky-nutstore/issues/${issueId}`) }));
        };
        const onClick = () => {
            deckyFrontendLib.showContextMenu(window.SP_REACT.createElement(deckyFrontendLib.Menu, { label: "Help" }, entries.map((e) => (window.SP_REACT.createElement(deckyFrontendLib.MenuItem, { onSelected: () => openModal(e.label, e.description, e.issueId) }, e.label)))));
        };
        return (window.SP_REACT.createElement("span", { style: { textDecoration: "underline", fontSize: "small", marginTop: "auto" }, onClick: onClick }, "\u5E2E\u52A9\uFF1F"));
    }

    function ConfigurePathsPage({ serverApi }) {
        const appState = ApplicationState.useAppState();
        const [includePaths, setIncludePaths] = React.useState(undefined);
        const [excludePaths, setExcludePaths] = React.useState(undefined);
        const onPathsUpdated = () => {
            (async () => {
                await ApiClient.getSyncPaths("includes").then((p) => setIncludePaths(p));
                await ApiClient.getSyncPaths("excludes").then((p) => setExcludePaths(p));
            })();
        };
        React.useEffect(() => onPathsUpdated(), []);
        return (window.SP_REACT.createElement(Container, { title: Translator.translate("sync.paths"), help: window.SP_REACT.createElement(HelpAssistant, { entries: [
                    {
                        label: Translator.translate("includes.vs.exclude"),
                        description: Translator.translate("help.exclude"),
                        issueId: "9",
                    },
                    {
                        label: Translator.translate("include.or.exclude.subf"),
                        description: Translator.translate("help.include.or.exclude.subf"),
                        issueId: "9",
                    },
                    {
                        label: Translator.translate("bug.file.picker"),
                        description: Translator.translate("help.file.picker.fail"),
                        issueId: "7",
                    },
                ] }) },
            window.SP_REACT.createElement(deckyFrontendLib.PanelSection, { title: Translator.translate("cloud.save.path") },
                window.SP_REACT.createElement(deckyFrontendLib.TextField, { disabled: false, value: appState.destination_directory, onChange: (e) => ApplicationState.setAppState("destination_directory", e.target.value, false), onBlur: (e) => ApplicationState.setAppState("destination_directory", e.target.value, true) })),
            window.SP_REACT.createElement(deckyFrontendLib.PanelSection, { title: Translator.translate("includes") },
                window.SP_REACT.createElement(deckyFrontendLib.PanelSectionRow, null,
                    window.SP_REACT.createElement(AddNewPathButton, { serverApi: serverApi, onPathAdded: onPathsUpdated, file: "includes" })),
                includePaths?.map((p) => (window.SP_REACT.createElement(deckyFrontendLib.PanelSectionRow, null,
                    window.SP_REACT.createElement(RenderExistingPathButton, { key: p, path: p, serverApi: serverApi, onPathRemoved: onPathsUpdated, file: "includes" }))))),
            window.SP_REACT.createElement(deckyFrontendLib.PanelSection, { title: Translator.translate("excludes") },
                window.SP_REACT.createElement(deckyFrontendLib.PanelSectionRow, null,
                    window.SP_REACT.createElement(AddNewPathButton, { serverApi: serverApi, onPathAdded: onPathsUpdated, file: "excludes" })),
                excludePaths?.map((p) => (window.SP_REACT.createElement(deckyFrontendLib.PanelSectionRow, null,
                    window.SP_REACT.createElement(RenderExistingPathButton, { key: p, path: p, serverApi: serverApi, onPathRemoved: onPathsUpdated, file: "excludes" })))))));
    }

    // THIS FILE IS AUTO GENERATED
    function BsCloudFill (props) {
      return GenIcon({"tag":"svg","attr":{"fill":"currentColor","viewBox":"0 0 16 16"},"child":[{"tag":"path","attr":{"d":"M4.406 3.342A5.53 5.53 0 0 1 8 2c2.69 0 4.923 2 5.166 4.579C14.758 6.804 16 8.137 16 9.773 16 11.569 14.502 13 12.687 13H3.781C1.708 13 0 11.366 0 9.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383z"}}]})(props);
    }

    /**
     * Nutstore (坚果云) WebDAV configuration is now rendered as a normal
     * in-page form instead of a modal. This avoids the Big Picture modal
     * getting stuck (no dismiss button / no focusable inputs) and lets
     * TextField reliably open the Steam on-screen keyboard for typing.
     */
    function ConfigureBackendPage({ serverApi }) {
        const [provider, setProvider] = React.useState(undefined);
        const [url, setUrl] = React.useState("https://dav.jianguoyun.com/dav/");
        const [user, setUser] = React.useState("");
        const [password, setPassword] = React.useState("");
        const [loading, setLoading] = React.useState(false);
        React.useEffect(() => {
            ApiClient.getCloudBackend().then((e) => setProvider(e ?? "N/A"));
        }, []);
        const handleSave = async () => {
            if (!user || !password) {
                Toast.toast(Translator.translate("nutstore.fail") + "：账号和密码均不能为空");
                return;
            }
            setLoading(true);
            try {
                const res = await serverApi.callPluginMethod("setup_webdav", { url, user, password });
                setLoading(false);
                if (res.success) {
                    Toast.toast(Translator.translate("nutstore.success"));
                    ApiClient.getCloudBackend().then((e) => setProvider(e ?? "N/A"));
                }
                else {
                    const errMsg = String(res.result);
                    if (errMsg.includes("RCLONE_MISSING")) {
                        Toast.toast("配置失败：插件缺少 rclone 程序，请重新安装插件包（需包含 bin/rclone）");
                    }
                    else {
                        Toast.toast(Translator.translate("nutstore.fail") + "：" + errMsg);
                    }
                }
            }
            catch (e) {
                setLoading(false);
                Toast.toast(Translator.translate("nutstore.fail") + "：" + String(e));
            }
        };
        return (window.SP_REACT.createElement(Container, { title: Translator.translate("nutstore.title") },
            window.SP_REACT.createElement(deckyFrontendLib.PanelSection, null,
                window.SP_REACT.createElement("strong", null,
                    Translator.translate("currently.using"),
                    ": ",
                    provider)),
            window.SP_REACT.createElement(deckyFrontendLib.PanelSection, null,
                window.SP_REACT.createElement("p", { style: { whiteSpace: "pre-wrap", margin: "0 0 12px 0" } }, Translator.translate("nutstore.desc")),
                window.SP_REACT.createElement(deckyFrontendLib.PanelSectionRow, null,
                    window.SP_REACT.createElement(deckyFrontendLib.TextField, { label: Translator.translate("nutstore.url"), value: url, onChange: (e) => setUrl(e.target.value) })),
                window.SP_REACT.createElement(deckyFrontendLib.PanelSectionRow, null,
                    window.SP_REACT.createElement(deckyFrontendLib.TextField, { label: Translator.translate("nutstore.account"), value: user, placeholder: "you@jianguoyun.com", mustBeEmail: true, onChange: (e) => setUser(e.target.value) })),
                window.SP_REACT.createElement(deckyFrontendLib.PanelSectionRow, null,
                    window.SP_REACT.createElement(deckyFrontendLib.TextField, { label: Translator.translate("nutstore.password"), value: password, bIsPassword: true, onChange: (e) => setPassword(e.target.value) })),
                window.SP_REACT.createElement("p", { style: { whiteSpace: "pre-wrap", marginTop: 12, color: "#a0a0a0", fontSize: 13 } }, Translator.translate("nutstore.hint")),
                window.SP_REACT.createElement(deckyFrontendLib.PanelSectionRow, null,
                    window.SP_REACT.createElement(deckyFrontendLib.ButtonItem, { onClick: handleSave, icon: window.SP_REACT.createElement(BsCloudFill, null), disabled: loading }, loading ? Translator.translate("nutstore.configuring") : Translator.translate("nutstore.save"))))));
    }

    function RenderSyncLogPage$1() {
        deckyFrontendLib.Navigation.CloseSideMenus();
        const [logs, _] = React.useState(() => Storage.getSessionStorageItem("syncLogs")?.replace(/\n{2,}/g, "\n") ?? "");
        return (window.SP_REACT.createElement(Container, { title: Translator.translate("sync.logs") },
            window.SP_REACT.createElement("div", { style: { maxHeight: "300px" } },
                window.SP_REACT.createElement("pre", { style: { overflowY: "scroll", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "smaller", maxHeight: "300px" } }, logs)),
            window.SP_REACT.createElement(SyncLogErrorButtons, { logs: logs })));
    }
    function SyncLogErrorButtons({ logs }) {
        const deleteLockNeeded = React.useMemo(() => logs.indexOf("rclone deletefile") > 0, [logs]);
        return (window.SP_REACT.createElement("div", null,
            window.SP_REACT.createElement("button", { hidden: !deleteLockNeeded, style: { marginLeft: "10px" }, onClick: () => {
                    deckyFrontendLib.Navigation.CloseSideMenus();
                    deckyFrontendLib.Navigation.NavigateBack();
                    Toast.toast(Translator.translate("deleting.locks.sync"));
                    ApiClient.deleteLocksAndResync();
                } }, Translator.translate("delete.locks"))));
    }

    function RenderSyncLogPage() {
        deckyFrontendLib.Navigation.CloseSideMenus();
        return (window.SP_REACT.createElement(Container, { title: Translator.translate("app.logs") },
            window.SP_REACT.createElement("div", { style: { maxHeight: "300px" } },
                window.SP_REACT.createElement("pre", { style: { overflowY: 'scroll', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: "smaller", maxHeight: "300px" } }, Storage.getSessionStorageItem("pluginLogs")?.replace(/\n{2,}/g, '\n')))));
    }

    var index = deckyFrontendLib.definePlugin((serverApi) => {
        Storage.clearAllSessionStorage();
        ApplicationState.initialize(serverApi).then(async () => {
            Backend.initialize(serverApi);
            await Logger.initialize();
            await Translator.initialize();
        });
        serverApi.routerHook.addRoute("/dcs-configure-paths", () => window.SP_REACT.createElement(ConfigurePathsPage, { serverApi: serverApi }), { exact: true });
        serverApi.routerHook.addRoute("/dcs-configure-backend", () => window.SP_REACT.createElement(ConfigureBackendPage, { serverApi: serverApi }), { exact: true });
        serverApi.routerHook.addRoute("/dcs-sync-logs", () => window.SP_REACT.createElement(RenderSyncLogPage$1, null), { exact: true });
        serverApi.routerHook.addRoute("/dcs-plugin-logs", () => window.SP_REACT.createElement(RenderSyncLogPage, null), { exact: true });
        const { unregister: removeGameExecutionListener } = SteamClient.GameSessions.RegisterForAppLifetimeNotifications((e) => {
            const currentState = ApplicationState.getAppState().currentState;
            if (currentState.sync_on_game_exit === "true") {
                const gameInfo = appStore.GetAppOverviewByGameID(e.unAppID);
                Logger.info((e.bRunning ? "Starting" : "Stopping") + " game '" + gameInfo.display_name + "' (" + e.unAppID + ")");
                ApplicationState.setAppState("playing", String(e.bRunning));
                if (shouldSync(gameInfo)) {
                    syncGame(e);
                }
            }
            else {
                Logger.info("No futher actions");
            }
        });
        return {
            title: window.SP_REACT.createElement("div", { className: deckyFrontendLib.staticClasses.Title }, "Decky Nutstore"),
            content: window.SP_REACT.createElement(Content, null),
            icon: window.SP_REACT.createElement(FaSave, null),
            onDismount() {
                removeGameExecutionListener();
                Storage.clearAllSessionStorage();
                serverApi.routerHook.removeRoute("/dcs-configure-paths");
                serverApi.routerHook.removeRoute("/dcs-configure-backend");
                serverApi.routerHook.removeRoute("/dcs-sync-logs");
                serverApi.routerHook.removeRoute("/dcs-plugin-logs");
            },
        };
    });
    function syncGame(e) {
        const currentState = ApplicationState.getAppState().currentState;
        let toast = currentState.toast_auto_sync === "true";
        if (e.bRunning) {
            // Game is starting: pull the latest saves from the cloud first.
            if (toast) {
                Toast.toast(Translator.translate("synchronizing.savedata"), 2000);
            }
            ApiClient.syncOnLaunch(toast, e.nInstanceID); // nInstanceID is Linux Process PID
        }
        else {
            // Game exited: push local saves to the cloud.
            ApiClient.syncOnEnd(toast);
        }
    }
    function shouldSync(gameInfo) {
        if (gameInfo?.store_category.includes(23)) {
            // 23 - Steam Cloud (skip games that already sync via Steam Cloud)
            Logger.info("Steam game with Steam Cloud, skipping");
            return false;
        }
        else {
            Logger.info("Non Steam game, or game without Steam Cloud, proceeding");
            return true;
        }
    }

    return index;

})(DFL, SP_REACT);
