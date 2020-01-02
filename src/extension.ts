// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cs from './cs';
// config
import ExtensionConfiguration from './core/ExtensionConfiguration';
import ViewManager from './views/ViewManager';
import CdsExplorer from './views/CdsExplorer';
import JsonObjectViewManager from './views/JsonObjectView';
import TemplateManager from './components/Templates/TemplateManager';
import DynamicsTerminal from './views/DynamicsTerminal';
import SolutionManager from './components/Solutions/SolutionManager';
import PluginStepViewManager from './views/PluginStepView';
import SvcUtilConfigViewManager from './views/ServiceUtilityConfigurationView';
import SolutionMap from './components/Solutions/SolutionMap';
import NewWorkspaceViewManager from './views/NewWorkspaceView';
import VisualStudioProjectCommands from './components/DotNetCore/DotNetProjectManager';
import TemplateExplorer from './views/TemplateExplorer';
import PluginStepImageViewManager from './views/PluginStepImageView';
import WebResourceManager from './components/Solutions/WebResourceManager';
import ExtensionContext from './core/ExtensionContext';
import IconDownloader from './components/WebDownloaders/IconDownloader';
import ScriptDownloader from './components/WebDownloaders/ScriptDownloader';
import CodeGenerationManager from './components/CodeGeneration/CodeGenerationManager';

let extensionContext: ExtensionContext;

export async function activate(context: vscode.ExtensionContext) {
	// Force initialization of our decorators by building an array of their classes.
	// tslint:disable-next-line: no-unused-expression
	[ IconDownloader, ScriptDownloader, CodeGenerationManager, SolutionMap, WebResourceManager, SolutionManager, VisualStudioProjectCommands, TemplateManager ];

	extensionContext = new ExtensionContext(context);

	// load and check extension configuration
	const toolsConfig = ExtensionConfiguration.getConfiguration(cs.cds.configuration.tools._namespace);

	// Setup any scripts that require tools configuration, then templating.
	[   // our views
		new CdsExplorer(),
		new TemplateExplorer(),
		new ViewManager(),
		new JsonObjectViewManager(),
		new SvcUtilConfigViewManager(),
		new DynamicsTerminal(),
		new PluginStepViewManager(),
		new PluginStepImageViewManager(),
		new NewWorkspaceViewManager()
	].forEach(c => c.contribute(context, toolsConfig));

	extensionContext.activate();

	return context.subscriptions;
}

// this method is called when your extension is deactivated
export function deactivate() { 
	extensionContext.deactivate(cs.cds.extension.productId);
}
