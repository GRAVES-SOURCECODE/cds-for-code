import vscode = require("vscode");
import ProjectTemplatesPlugin from "../projectTemplatesPlugin";
import ExtensionConfiguration from "../config/ExtensionConfiguration";
import * as cs from "../cs";
import QuickPicker from "../helpers/QuickPicker";

/**
 * Main command to save the current project as a template.
 * This command can be invoked by the Command Palette or in a folder context menu on the explorer view.
 * @export
 * @param {ProjectTemplatesPlugin} templateManager
 * @param {*} args
 */
export default async function run(templateManager: ProjectTemplatesPlugin, defaultUri?: vscode.Uri) {
	// get workspace folder
	let workspace = await QuickPicker.pickWorkspaceFolder(defaultUri, "Choose a workspace folder containing the template");

    if (!workspace) {
		vscode.window.showErrorMessage("No workspace selected");

        return;
	}
	
	// load latest configuration
	ExtensionConfiguration.updateConfiguration(cs.dynamics.configuration.templates._namespace);

    templateManager.saveAsTemplate(workspace).then(
		(template : string | undefined) => { 
			if (template) {
				vscode.window.showInformationMessage("Saved template '" + template + "'");
			}
		},
		(reason : any) => { 
			vscode.window.showErrorMessage("Failed to save template: " + reason);
		}
	);   
}