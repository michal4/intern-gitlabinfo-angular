import { environment } from "../environments/environment";

/**
 * Util pro konkrétní HttpRequest dotaz.
 */
export class XmlHttpRequestUtils {

    /**
     * Základní načtení apiBasePath přes XMLHttpRequest. (AppConfigService je inicializována až později)
     */
    public static getApiBasePathXMLHttpRequest(): string {
        let request = new XMLHttpRequest();
        request.open('GET', environment.configPath, false);
        request.send(null);
        const response = JSON.parse(request.responseText);
        return response.apiBasePath;
    }

    /**
     * Kontrola zda existuje index.html přes XMLHttpRequest.
     */
    public static isIndexHtmlExist(): boolean {
        let request = new XMLHttpRequest();
        request.open('GET', environment.indexPath, false);

        let isIndex: boolean = false;

        request.onreadystatechange = function (oEvent) {
            if (request.readyState === 4) {
                isIndex = request.status === 200;
            }
        };
        request.send(null);

        return isIndex;
    }
}
