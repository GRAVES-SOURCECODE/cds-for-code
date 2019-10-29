// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    // You MUST set = window.vscodeApi for scripts in main.js to work properly
    const vscode = window.vscodeApi = acquireVsCodeApi();
    const formElements = document.getElementsByClassName("field-container");
    const formTypeLabels = document.getElementsByClassName("form-type-label");
    const submitButton = document.getElementById("submitButton");
    const addRuleButtons = document.querySelectorAll("button[id^='AddRule']");
    window.currentTabId = "WhiteList";
    let currentView = window.currentView = "Entities";

    // changes the view in tabs
    const changeView = window.changeView = function(event, viewName) {
        // no event, just return
        if (!event) { return; }
        // set current view name
        currentView = viewName;

        // show all of the right divs based on if they contain the view name
        // in the data-form element comma delimited list
        for (let i = 0; i < formElements.length; i++) {
            const el = formElements[i];
            if (el.getAttribute("data-form").indexOf(viewName) === -1) {
                el.setAttribute("hidden", "hidden");
            } else {
                el.removeAttribute("hidden");
            }
        }

        // update all the labels with the correct view
        for (let i = 0; i < formTypeLabels.length; i++) {
            const el = formTypeLabels[i];
            el.innerHTML = viewName;
        }
    };

    // wire up click for all add rule buttons
    for (let i = 0; i < addRuleButtons.length; i++) {
        const button = addRuleButtons[i];
        button.addEventListener("click", event => {
            event.preventDefault();
            const buttonId = event.currentTarget.id;
            // if we have a number, we want to suffix all the ids
            // with the same number
            const fieldSuffix = /\d/.test(buttonId)
                ? buttonId.charAt(buttonId.length - 1)
                : "";
        });
    }

    submitButton.addEventListener("click", event => {
        event.preventDefault();
    });

    // Handle messages sent from the extension to the webview
    window.addEventListener("message", event => {
        const message = event.data;

        switch (message.command) {
            case "configure":
                break;
        }
    });

}());