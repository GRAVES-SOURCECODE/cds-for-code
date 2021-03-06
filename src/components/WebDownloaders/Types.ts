import * as vscode from 'vscode';
import * as path from 'path';
import * as cs from '../../cs';
import { Utilities } from '../../core/Utilities';
import Dictionary from '../../core/types/Dictionary';
import * as FileSystem from '../../core/io/FileSystem';
import * as DynamicsTreeView from '../../views/cs.cds.viewContainers.cdsExplorer';
import { TS } from 'typescript-linq';
import * as TemplateTreeView from '../../views/cs.cds.viewContainers.templateExplorer';
import ExtensionConfiguration from '../../core/ExtensionConfiguration';
import logger from '../../core/framework/Logger';
import download from '../../core/http/nodeJsFileDownloader';

export type ExtensionIcon = DynamicsTreeView.CdsExplorerEntryType | TemplateTreeView.TemplateExplorerEntryType | 'Add' | 'Edit' | 'Delete' | 'Refresh' | 'Save' | 'Cancel';

const defaultIcons:Dictionary<ExtensionIcon, string> = new Dictionary<ExtensionIcon, string>([
    { key: "Connection", value: 'uil-cloud-data-connection' },
    { key: "Organization", value: 'jam-building-f' },
    { key: "Entities", value: "ant-design:folder-open-twotone" },
    { key: "Attributes", value: "ant-design:folder-open-twotone" },
    { key: "Views", value: "ant-design:folder-open-twotone" },
    { key: "Charts", value: "ant-design:folder-open-twotone" },
    { key: "Dashboards", value: "ant-design:folder-open-twotone" },
    { key: "Keys", value: "ant-design:folder-open-twotone" },
    { key: "Relationships", value: "ant-design:folder-open-twotone" },
    { key: "Forms", value: "ant-design:folder-open-twotone" },
    { key: "OptionSets", value: "ant-design:folder-open-twotone" },
    { key: "Processes", value: "ant-design:folder-open-twotone" },
    { key: "WebResources", value: "ant-design:folder-open-twotone" },
    { key: "Plugins", value: "ant-design:folder-open-twotone" },
    { key: "Solutions", value: "ant-design:folder-open-twotone" },
	{ key: "Folder", value: "ant-design:folder-open-twotone" },
	{ key: "Applications", value: "ant-design:folder-open-twotone" },
    { key: "Entity", value: 'fe-table' },
    { key: "Attribute", value: 'whh-twocolumnsrightalt' },
    { key: "View", value: "ic-baseline-pageview" },
    { key: "Chart", value: "ant-design:area-chart-outline" },
    { key: "Dashboard", value: "ic-twotone-dashboard" },
    { key: "Key", value: "ion-key-sharp" },
    { key: "OneToManyRelationship", value: "emojione-monotone:right-arrow" },
    { key: "ManyToOneRelationship", value: "emojione-monotone:left-arrow" },
    { key: "ManyToManyRelationship", value: "emojione-monotone:left-right-arrow" },
    { key: "Form", value: "dashicons-format-aside" },
	{ key: "OptionSet", value: "ion-options-outline" },
	{ key: "Option", value: "simple-line-icons:options" },
    { key: "Process", value: "vaadin-file-process" },
    { key: "WebResource", value: "fa-file-code-o" },
    { key: "Plugin", value: "mdi-codepen" },
    { key: "PluginStep", value: "uil-processor" },
    { key: "PluginStepImage", value: "ic-baseline-image-search" },
    { key: "PluginType", value: "fe-prototype" },
    { key: "Solution", value: "ic-round-border-all" },
	{ key: "Application", value: "mdi-application" },
    { key: "ProjectTemplate", value: "icomoon-free:insert-template" },
    { key: "ItemTemplate", value: "icomoon-free:insert-template" },
    { key: "Add", value: "ic-baseline-add" },
    { key: "Edit", value: "ic-twotone-edit" },
    { key: "Refresh", value: "ic-round-refresh" },
    { key: "Delete", value: "ic-twotone-delete" },
    { key: "Save", value: "ic-twotone-save-alt" },
    { key: "Cancel", value: "ic-twotone-cancel" },
]);

export class ExtensionIconTheme {
	constructor(name: string, mappings: Dictionary<ExtensionIcon, string>, lightColor?: string, darkColor?: string) {
		this.name = name;
		this.mappings = mappings;
		this.lightColor = lightColor;
		this.darkColor = darkColor;
	}
    
    get icons(): TS.Linq.Enumerator<IconifyIcon> {
		return new TS.Linq.Enumerator(ExtensionIconTheme.getIcons(this.mappings, this.lightColor, this.darkColor));
	}
    
    name: string;
	lightColor: string;
	darkColor: string;
	mappings: Dictionary<ExtensionIcon, string>;
    
    resolve(folder: string, icon: ExtensionIcon): IconResolver {
		folder = folder.replace("~/", "../../../../");
    
        const destination = path.join(folder, this.name.replace(`${cs.cds.configuration.iconThemes._namespace}.`, ''));
		const icons = this.icons.where(i => i.extensionIcon === icon);
		const lightIcon = icons.where(i => i.annotation === "light").first();
		const darkIcon = icons.where(i => i.annotation === "dark").first();
		const resolver = new IconResolver(path.join(destination, lightIcon.mappedOutputFile), path.join(destination, darkIcon.mappedOutputFile));
    
        return resolver;
    }
    
	//TODO: remove dependence on fetch.
	async downloadIcons(folder: string): Promise<string> {
		const destination = path.join(folder, this.name.replace(`${cs.cds.configuration.iconThemes._namespace}.`, ''));
	
		if (this.icons) {
			await Utilities.Async.forEach(this.icons.toArray(), async icon => {
				const localPath = path.join(destination, icon.mappedOutputFile);
		
				FileSystem.makeFolderSync(path.dirname(localPath));
		
				if (FileSystem.exists(localPath)) {
					return;
				}

				await download(icon.url, localPath)
					.then(file => {
						logger.log(`Command: ${cs.cds.extension.downloadRequiredIcons} Download icon: ${icon.url} completed.`);
		
						return file;
					}).catch(error => {
						const message = (error.message || error).toString();

						logger.error(`Command: ${cs.cds.extension.downloadRequiredIcons} Download icon ${icon.url} failed: ${message}`);
					});
			});
		}
        
		return destination;
    }
    
	private static getIcons(mappings: Dictionary<ExtensionIcon, string>, lightColor?: string, darkColor?: string): IconifyIcon[] {
        const returnObject: IconifyIcon[] = [];
        
		if (mappings) {
			for (let i = 0; i < mappings.keys.length; i++) {
				if (!lightColor && !darkColor) {
					returnObject.push(new IconifyIcon(mappings.values[i], undefined, undefined, undefined, undefined, undefined, mappings.keys[i]));
                }
                
				if (lightColor) {
					returnObject.push(new IconifyIcon(mappings.values[i], lightColor, "light", undefined, undefined, undefined, mappings.keys[i]));
                }
                
				if (darkColor) {
					returnObject.push(new IconifyIcon(mappings.values[i], darkColor, "dark", undefined, undefined, undefined, mappings.keys[i]));
				}
			}
        }
        
		return returnObject;
	}
}

export class ExtensionIconThemes {
    static get default(): ExtensionIconTheme {
		const colorConfig = vscode.extensions.getExtension(cs.cds.extension.productId).packageJSON.contributes.colors.find(c => c.id === cs.cds.theme.colors.icons);

		return new ExtensionIconTheme(cs.cds.configuration.iconThemes.default, defaultIcons, colorConfig.defaults.light, colorConfig.defaults.dark);
	}

    private static _themes: ExtensionIconTheme[] = [ ExtensionIconThemes.default ];

    static get selected(): ExtensionIconTheme {
		let configValue = ExtensionConfiguration.getConfigurationValueOrDefault(cs.cds.configuration.iconThemes.selectedTheme, cs.cds.configuration.iconThemes.default);

        if (!configValue.startsWith(cs.cds.configuration.iconThemes._namespace)) {
			configValue = cs.cds.configuration.iconThemes._namespace + "." + configValue;
		}

        return this.get(configValue);
	}

    static get(name: string) {
		return this._themes.find(t => t.name === name);
	}

    static register(theme: ExtensionIconTheme) {
		if (this._themes.indexOf(theme) === -1) {
			this._themes.push(theme);
		}
	}

    static unregister(theme: ExtensionIconTheme) {
		if (this._themes.indexOf(theme) !== -1) {
			this._themes.splice(this._themes.indexOf(theme), 1);
		}
	}
}

export enum ScriptedIconFormat {
	svg = ".svg",
	js = ".js",
	json = ".json"
}

export class IconResolver {
    readonly iconPath: { light: string | vscode.Uri; dark: string | vscode.Uri } = null;

    constructor(
        readonly lightPath: string,
        readonly darkPath: string
    ) {
        this.iconPath = {
            light: path.join(__filename, ...lightPath.split("/")),
            dark: path.join(__filename, ...darkPath.split("/"))
        };
    }
}

export class IconifyIcon {
	private _color: string;

    height?: number;
	width?: number;
	name: string;
	format: ScriptedIconFormat;
	annotation: string;
	extensionIcon: ExtensionIcon;

    constructor(name: string, color?: string, annotation?: string, height: number = 0, width: number = 0, format: ScriptedIconFormat = ScriptedIconFormat.svg, extensionIcon?: ExtensionIcon) {
		this.name = name;
		this.color = color;
		this.annotation = annotation;
		this.height = height;
		this.width = width;
		this.format = format;
		this.extensionIcon = extensionIcon;
	}

    get color(): string { return this._color; }
	set color(value: string) {
		if (value) {
			this._color = value;
		}
	}

    get url(): string {
		return `https://api.iconify.design/${this.name}${this.format.toString()}?${this.toQueryObject()}`;
	}

    get mappedOutputFile(): string {
		return `${this.extensionIcon.replace(" ", "")}${this.annotation ? "." + this.annotation : ""}${this.format.toString()}`;
	}

    get outputfile(): string {
		return `${this.name.replace(":", "-")}${this.annotation ? "." + this.annotation : ""}${this.format.toString()}`;
	}

    get mimeType(): string {
		switch (this.format) {
			case ScriptedIconFormat.svg:
				return 'image/svg+xml';
			case ScriptedIconFormat.js:
				return 'application/javascript';
			case ScriptedIconFormat.json:
				return 'application/json';
		}
	}

    private isColorCode(value: string): boolean {
		return value && value.match('^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$') !== null;
	}

    private toQueryObject(): any {
		const querystring: any = {};

        if (!Utilities.$Object.isNullOrEmpty(this._color)) {
			querystring["color"] = this._color;
		}

        if (this.height > 0) {
			querystring["height"] = this.height;
		} else {
			querystring["height"] = "auto";
		}

        if (this.width > 0) {
			querystring["width"] = this.height;
		}

		querystring["box"] = "true";
		querystring["inline"] = "false";
		querystring["download"] = "true";

        return Utilities.$Object.asQuerystring(querystring);
	}
}
