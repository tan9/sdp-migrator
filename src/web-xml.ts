export interface WebXml {
    webApp: WebApp;
}

export interface WebApp {
    displayName: string;
    listener: Listener[];
    contextParam: TParam[];
    filter: Filter[];
    filterMapping: FilterMapping[];
    servlet: Servlet[];
    servletMapping: ServletMapping[];
    welcomeFileList: WelcomeFileList;
    envEntry: EnvEntry[];
}

export interface TParam {
    paramName: string;
    paramValue: string;
}

export interface EnvEntry {
    description: string;
    envEntryName: string;
    envEntryType: string;
    envEntryValue: string;
}

export interface Filter {
    filterName: string;
    filterClass: string;
    initParam?: TParam[] | TParam;
}

export interface FilterMapping {
    filterName: string;
    urlPattern: string;
}

export interface Listener {
    listenerClass: string;
}

export interface Servlet {
    servletName: string;
    servletClass: string;
    initParam?: TParam;
    loadOnStartup?: string;
}

export interface ServletMapping {
    servletName: string;
    urlPattern: string;
}

export interface WelcomeFileList {
    welcomeFile: string;
}
