// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    // this stuff will be available on script load
    const vscode = window.CloudSmith.getHost();
    //const oldState = vscode.getState();

    // Handle messages sent from the extension to the webview
    window.addEventListener("message", event => {
        // wait for document ready
        $(document).ready(function () {
            const message = event.data; // The json data that the extension sent
            switch (message.command) {
                case "load":
                    if (message.message) {
                        setInitialState(message.message);
                    }

                    break;
                case "error":
                    CloudSmith.ErrorPanel.showError([`${message.message}`]);

                    M.updateTextFields();

                    break;
                case "bindDiscovery":
                    bindDiscovery(message);
                    break;
            }
        });
    });

    function bindDiscovery(discovery) {
        $("#Online-OrgUrl").val(discovery.organization);

        if (discovery.accessToken) {
            $("#AccessToken").val(discovery.accessToken);
        }

        if (discovery.refreshToken) {
            $("#RefreshToken").val(discovery.refreshToken);
        }

        if (discovery.isMultiFactorAuthentication) {
            $("#IsMultiFactorAuthentication").val(true);
        }

        M.updateTextFields();
    }

    const urlRegEx = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)[a-z0-9]+([\-\.]{1}[a-z0-9]+)*(\.[a-z]{2,5})?(:[0-9]{1,5})?(\/.*)?$/gi;
    const onlineUrlRegEx = /^(http(|s):\/\/)?(.+).crm(|\d{1,2}).dynamics.com(|\/)/gi;

    function normalizeOnlineUrl(url, api) {
        for (match of url.matchAll(onlineUrlRegEx)) {
            if (match && match.length >= 4) {
                if (!api) {
                    return "https://" + match[3] + ".crm" + match[4] + ".dynamics.com";
                } else {
                    return "https://" + match[3] + ".api.crm" + match[4] + ".dynamics.com";
                }
            }
        }

        return url;
    }

    function setInitialState(apiConfig) {
        let mode = 'add';

        if (apiConfig.id && apiConfig.id !== "") {
            mode = 'edit';

            const $title = $("#title");
            $title.html($title.html().replace("New", "Edit"));
            document.title = $title.text();
        }

        // Move to the connection panel
        M.Collapsible.getInstance($("#ConnectionOptions")).open(1);

        // Swap our tabs
        const selectedTab =
            apiConfig.type === 1 ? "windowsAuth" :
            apiConfig.type === 2 ? "onlineAuth" :
            apiConfig.type === 3 ? "azureAuth" :
            apiConfig.type === 4 ? "ifdAuth" : undefined;

        if (selectedTab) {
            M.Tabs.getInstance($('#ConnectionTypeTabs')).select(selectedTab);
        }

        // The uusal
        $("#ConnectionId").val(apiConfig.id || $("#ConnectionId").val() || "");
        $("#ConnectionName").val(apiConfig.name || $("#ConnectionName").val() || "");

        // Advanced options
        $("#WebApiVersion").val(apiConfig.webApiVersion);
        $("#WebApiVersion").formSelect();

        if (apiConfig.accessToken) {
            $("#AccessToken").val(apiConfig.accessToken);
        }

        if (apiConfig.refreshToken) {
            $("#RefreshToken").val(apiConfig.refreshToken);
        }

        if (apiConfig.isMultiFactorAuthentication) {
            $("#IsMultiFactorAuthentication").val(true);
        }

        switch (apiConfig.type) {
            case 1:
                $("#OnPrem-ServerUrl").val(apiConfig.webApiUrl || "");
                $("#OnPrem-Domain").val(apiConfig.credentials ? apiConfig.credentials.domain || "" : "");
                $("#OnPrem-Username").val(apiConfig.credentials ? apiConfig.credentials.username || "" : "");
                $("#OnPrem-Password").val(apiConfig.credentials ? apiConfig.credentials.password || "" : "");
                $("#OnPrem-Password").prop("disabled", mode === 'edit');

                if (mode === 'edit') {
                    // Show the edit link, hide the label, wire up change of username to enable password entry.
                    $("label[for='OnPrem-Password'] > [data-action='edit-password']").prop("hidden", false);
                    $("label[for='OnPrem-Password'] > span").prop("hidden", true);

                    $("#OnPrem-Username").change(function () {
                        $("#OnPrem-Password").prop("disabled", false);
                        $("label[for='OnPrem-Password'] > [data-action='edit-password']").prop("hidden", true);
                        $("label[for='OnPrem-Password'] > span").prop("hidden", false);
                    });
                }

                break;
            case 2:
                $("#Online-OrgUrl").val(apiConfig.appUrl ? normalizeOnlineUrl(apiConfig.appUrl, false) : apiConfig.webApiUrl ? normalizeOnlineUrl(apiConfig.webApiUrl, false) : "");
                $("#Online-Username").val(apiConfig.credentials ? apiConfig.credentials.username || "" : "");
                $("#Online-Password").val(apiConfig.credentials ? apiConfig.credentials.password || "" : "");
                $("#Online-Password").prop("disabled", mode === 'edit');

                if (mode === 'edit') {
                    // Show the edit link, hide the label, wire up change of username to enable password entry.
                    $("label[for='Online-Password'] > [data-action='edit-password']").prop("hidden", false);
                    $("label[for='Online-Password'] > span").prop("hidden", true);

                    $("#Online-Username").change(function () {
                        $("#Online-Password").prop("disabled", false);
                        $("label[for='Online-Password'] > [data-action='edit-password']").prop("hidden", true);
                        $("label[for='Online-Password'] > span").prop("hidden", false);
                    });
                }

                break;
            case 3:
                $("#AzureAd-ResourceUrl").val(apiConfig.webApiUrl || "");
                $("#AzureAd-ClientId").val(apiConfig.credentials ? apiConfig.credentials.username || "" : "");
                $("#AzureAd-ClientSecret").val(apiConfig.credentials ? apiConfig.credentials.password || "" : "");
                $("#AzureAd-AuthorityUrl").val(apiConfig.authorityUri ? apiConfig.authorityUri || "" : "");
                $("#AzureAd-ClientSecret").prop("disabled", mode === 'edit');

                if (mode === 'edit') {
                    // Show the edit link, hide the label, wire up change of username to enable password entry.
                    $("label[for='AzureAd-ClientSecret'] > [data-action='edit-password']").prop("hidden", false);
                    $("label[for='AzureAd-ClientSecret'] > span").prop("hidden", true);

                    $("#AzureAd-ClientId").change(function () {
                        $("#AzureAd-ClientSecret").prop("disabled", false);
                        $("label[for='AzureAd-ClientSecret'] > [data-action='edit-password']").prop("hidden", true);
                        $("label[for='AzureAd-ClientSecret'] > span").prop("hidden", false);
                    });
                }

                break;
            case 4:
                break;
        }

        M.updateTextFields();
    }

    function validateDiscovery(settings) {
        const messages = [];

        if (CloudSmith.Utilities.isNullOrEmpty(settings.credentials.username))
            messages.push("The Username is required");
        if (CloudSmith.Utilities.isNullOrEmpty(settings.credentials.password))
            messages.push('The Password is required');

        // show errors
        CloudSmith.ErrorPanel.showError(messages);

        // if false, we have errors
        return messages.length === 0;
    }

    function validateForm(settings) {
        const messages = [];
        const mode = settings.id && settings.id !== "" ? 'edit' : 'add';

        // Online can do global disco
        if (settings.type !== 2) {
            if (CloudSmith.Utilities.isNullOrEmpty(settings.webApiUrl))
                messages.push("The Server URL or Resource URL is required");
            else if (!urlRegEx.test(settings.webApiUrl))
                messages.push("The Server URL or Resource URL is invalid");
        } else {
            if (!onlineUrlRegEx.test(settings.webApiUrl)) {
                messages.push(`The url '${settings.webApiUrl}' is not a valid CDS Online URL.  The format is 'https://{name}.crm{number}.dynamics.com'.`);
            }
        }

        if (settings.type !== 3) {
            if (CloudSmith.Utilities.isNullOrEmpty(settings.credentials.username))
                messages.push("The Username is required");
            if (CloudSmith.Utilities.isNullOrEmpty(settings.credentials.password) && mode !== "edit")
                messages.push('The Password is required');
        }

        if (settings.type === 1) {
            if (CloudSmith.Utilities.isNullOrEmpty(settings.credentials.domain))
                messages.push("The Domain is required");
        } else if (settings.type === 2) {
            if (CloudSmith.Utilities.isNullOrEmpty(settings.credentials.token) &&
                CloudSmith.Utilities.isNullOrEmpty(settings.credentials.username)) {
                messages.push("Access Token or Username and Password is required");
            }
            if (CloudSmith.Utilities.isNullOrEmpty(settings.credentials.token) &&
                !CloudSmith.Utilities.isNullOrEmpty(settings.credentials.username) &&
                CloudSmith.Utilities.isNullOrEmpty(settings.credentials.password) &&
                mode !== "edit") {
                messages.push('The Password is required');
            }
        } else if (settings.type === 3) {
            if (CloudSmith.Utilities.isNullOrEmpty(settings.credentials.clientId))
                messages.push('The Client ID is required');

            if (CloudSmith.Utilities.isNullOrEmpty(settings.credentials.clientSecret) &&
                mode !== 'edit')
                messages.push('The Client Secret is required');

            if (CloudSmith.Utilities.isNullOrEmpty(settings.credentials.authority))
                messages.push('The Authority Url is required');
        }

        // show errors
        CloudSmith.ErrorPanel.showError(messages);

        // if false, we have errors
        return messages.length === 0;
    }

    function createSettings() {
        const id = $("#ConnectionId").val();

        let settings = {};

        const type = $("#windowsAuth").hasClass("active") ? 1 :
            $("#onlineAuth").hasClass("active") ? 2 :
            $("#azureAdAuth").hasClass("active") ? 3 :
            $("#ifdAuth").hasClass("active") ? 4 : undefined;

        const apiVersion = $("#WebApiVersion-Select").prop("checked") ? $("#WebApiVersion").val() : "";
        const refreshToken = $("#OAuthToken-Select").prop("checked") ? $("#OAuthToken").val() : $("#RefreshToken").val() || undefined;
        const accessToken = $("#AccessToken").val() || undefined;
        const isMultiFactorAuthentication = $("#IsMultiFactorAuthentication").val() || undefined;

        const apiUri =
            type && type === 1 ? $("#OnPrem-ServerUrl").val() :
            type && type === 2 ? normalizeOnlineUrl($("#Online-OrgUrl").val(), true) :
            type && type === 3 ? $("#AzureAd-ResourceUrl").val() :
            undefined;

        const appUri = type && type === 2 ? normalizeOnlineUrl($("#Online-OrgUrl").val(), false) : apiUri;

        if (type && type === 2) {
            $("#Online-OrgUrl").val(appUri);
        }

        const credentials = {};

        switch (type) {
            case 1:
                credentials.domain = $("#OnPrem-Domain").val();
                credentials.username = $("#OnPrem-Username").val();

                if ($("#OnPrem-Password").prop("disabled") === false) {
                    credentials.password = $("#OnPrem-Password").val();
                }

                break;
            case 2:
                credentials.resource = appUri || 'https://disco.crm.dynamics.com/';
                credentials.username = $("#Online-Username").val();

                if ($("#Online-Password").prop("disabled") === false) {
                    credentials.password = $("#Online-Password").val();
                }

                break;
            case 3:
                credentials.clientId = $("#AzureAd-ClientId").val();

                if ($("#AzureAd-ClientSecret").prop("disabled") === false) {
                    credentials.clientSecret = $("#AzureAd-ClientSecret").val();
                }

                credentials.resource = $("#AzureAd-ResourceUrl").val();
                credentials.authority = $("#AzureAd-AuthorityUrl").val();

                break;
        }

        if (refreshToken) {
            credentials.refreshToken = refreshToken;
        }

        if (accessToken) {
            credentials.accessToken = accessToken;
        }

        if (isMultiFactorAuthentication) {
            credentials.isMultiFactorAuthentication = true;
        }

        settings = {
            id: (id.length > 0) ? id : null, // pass the id or null
            type: type,
            webApiVersion: apiVersion,
            name: $("#ConnectionName").val(),
            webApiUrl: apiUri,
            appUrl: appUri,
            credentials: credentials
        };

        return settings;
    }

    // this part starts on document ready
    $(function () {
        M.AutoInit();

        // Send this back to our extension for parsing.
        $("[data-action='parse-connectionstring']").click(function () {
            vscode.postMessage({
                command: "parse-connectionstring",
                connectionString: $("#ConnectionString").val()
            });
        });

        $("[data-action='discover']").click(function () {
            const settings = createSettings();

            if (validateDiscovery(settings)) {
                vscode.postMessage({
                    command: "discover",
                    settings
                });
            }
        });

        $("[data-action='edit-password']").click(function () {
            const settings = createSettings();

            vscode.postMessage({
                command: "edit-password",
                settings
            });
        });

        $("[data-action='save']").click(function () {
            const settings = createSettings();

            if (validateForm(settings)) {
                vscode.postMessage({
                    command: "save",
                    settings
                });
            }
        });
    });
}());