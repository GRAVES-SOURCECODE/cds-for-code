import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as doT from 'dot';
import * as cs from '../../cs';
import * as FileSystem from '../../core/io/FileSystem';
import { TemplateItem, Interactive, TemplateAnalysis, TemplateContext, TemplateCommand, TemplateCommandExecutionStage, TemplateType } from "./Types";
import TemplateManager from './TemplateManager';
import Quickly from '../../core/Quickly';
import ExtensionContext from '../../core/ExtensionContext';
import TerminalManager, { TerminalCommand } from '../Terminal/SecureTerminal';
import ExtensionConfiguration from '../../core/ExtensionConfiguration';
import { CdsSolutions } from '../../api/CdsSolutions';
import ApiRepository from '../../repositories/apiRepository';
import DiscoveryRepository from '../../repositories/discoveryRepository';
import MetadataRepository from '../../repositories/metadataRepository';
import { CdsWebApi } from '../../api/cds-webapi/CdsWebApi';

export default class TemplateEngine {
    private static readonly fileNameRegex = /\$\{([\s\S]+?)\}/g;
    // evaluate: <% %>
    // interpolate: <%= %>
    // encode: <%! %>
    // use: <%# %>
    // define: <%## #%>
    // conditional: <%? %>
    // iterate: <%~ %>
    private static readonly dotSettings: doT.TemplateSettings = {
        evaluate: /\<\%([\s\S]+?)\%\>\n?/g,
        interpolate: /\<\%=([\s\S]+?)\%\>/g,
        encode: /\<\%!([\s\S]+?)\%\>\n?/g,
        use: /.*?\<\%#([\s\S]+?)\%\>\n?/g,
        useParams: /(^|[^\w$])def(?:\.|\[[\'\"])([\w$\.]+)(?:[\'\"]\])?\s*\:\s*([\w$\.]+|\"[^\"]+\"|\'[^\']+\'|\{[^\}]+\})/g,
        define: /.*?\<\%##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\%\>\n?/g,
        defineParams: /^\s*([\w$]+):([\s\S]+)/,
        conditional: /\<\%\?(\?)?\s*([\s\S]*?)\s*\%\>\n?/g,
        iterate: /\<\%~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\%\>)\n?/g,
        varname: '$this',
        strip: false,
        append: true,
        selfcontained: false
    };
    private static templateDefs: any;

    static async executeTemplate(template: TemplateItem, outputPath: string, ...object: any): Promise<TemplateContext> {  
        let templatePath;
        const systemTemplates = await TemplateManager.getDefaultTemplatesFolder(true);

        if (FileSystem.exists(path.join(systemTemplates, template.location))) {
            templatePath = path.join(systemTemplates, template.location);
        } else {
            templatePath = path.join(TemplateManager.getDefaultTemplatesFolder(false), template.location);
        }

        const analysis = await this.analyzeTemplate(templatePath, outputPath);
        const templateContext = await this.buildTemplateContext(analysis, ...object);

        if (templateContext.userCanceled) { return templateContext; }

        await this.executeCommands(templateContext, TemplateCommandExecutionStage.PreRun);

        for (let i = 0; i < analysis.files.length; i++) {
            const file = analysis.files[i];
            const destination = file.destination.replace(this.fileNameRegex, (match, key) => templateContext.parameters[key] || match);

            templateContext.executionContext.currentFile = {
                source: file.source,
                destination
            };

            const fileContents = (file.templateFn)
                ? file.templateFn(templateContext)
                : file.fileContents;

            const parentDir = path.dirname(destination);
            FileSystem.makeFolderSync(parentDir);

            FileSystem.writeFileSync(destination, fileContents);

            templateContext.executionContext.processedFiles = templateContext.executionContext.processedFiles || [];
            templateContext.executionContext.processedFiles.push({
                source: file.source,
                destination
            });
        }

        await this.executeCommands(templateContext, TemplateCommandExecutionStage.PostRun);

        return templateContext;
    }

    static async analyzeTemplate(templatePath: string, outputPath?: string): Promise<TemplateAnalysis> {
        const result = new TemplateAnalysis();
        let template = new TemplateItem();

        const interactives: { [name: string]: Interactive } = {};
        const commands: TemplateCommand[] = [];

        const allTemplatePaths = !FileSystem.stats(templatePath).isDirectory()
            ? [ templatePath ]
            : FileSystem.walkSync(templatePath);

        const templateDefs = {
            template(item: TemplateItem) {
                template = TemplateItem.merge(template, item);
                return '';
            },
            data: {
                cdsEntity(name: string, connection: string, solution: string, entity: string) {
                    interactives[name] = {
                        type: 'cdsEntity',
                        message: null,
                        options: { connection, solution, entity }
                    };
                    return '';
                },
                cdsSolution(name: string, connection: string, solution: string) {
                    interactives[name] = {
                        type: 'cdsSolution',
                        message: null,
                        options: [ connection, solution ]
                    };
                    return '';
                },
                cdsConnection(name: string, connectionName: string) {
                    interactives[name] = {
                        type: 'cdsConnection',
                        message: null,
                        options: { connection: connectionName }
                    };
                    return '';
                },
                cdsWebApi(name: string, connectionName: string) {
                    interactives[name] = {
                        type: 'cdsWebApi',
                        message: null,
                        options: { connection: connectionName }
                    };
                    return '';
                },
                cdsFake(name: string, connection?: string, entity?: string) {
                    interactives[name] = {
                        type: 'cdsFake',
                        message: null,
                        options: { connection, entity }
                    };
                }
            },
            ui: {
                prompt(name: string, message: string) {
                    interactives[name] = {
                        type: 'prompt',
                        message
                    };
                    return '';
                },
                select(name: string, message: string, items: string[]) {
                    interactives[name] = {
                        type: 'select',
                        message,
                        options: { items }
                    };
                    return '';
                },
                confirm(name: string, message: string) {
                    interactives[name] = {
                        type: 'confirm',
                        message
                    };
                    return '';
                },
                cdsEntity(name: string, message: string, connection: string, solution: string) {
                    interactives[name] = {
                        type: 'cdsEntity',
                        message: message,
                        options: { connection, solution }
                    };
                    return '';
                },
                cdsSolution(name: string, message: string, connection: string) {
                    interactives[name] = {
                        type: 'cdsSolution',
                        message: message,
                        options: [ connection ]
                    };
                    return '';
                },
                cdsWebApi(name: string, message: string, connection: string) {
                    interactives[name] = {
                        type: 'cdsWebApi',
                        message: message,
                        options: [ connection ]
                    };
                    return '';
                },
                cdsConnection(name: string, message: string) {
                    interactives[name] = {
                        type: 'cdsConnection',
                        message: message
                    };
                    return '';
                }
            },
            run: {
                dotnet(commandArgs: string) {
                    commands.push({
                        type: 'dotnet',
                        commandArgs,
                        stage: TemplateCommandExecutionStage.PostRun
                    });
                    return '';
                },
                npm(commandArgs: string) {
                    commands.push({
                        type: 'npm',
                        commandArgs,
                        stage: TemplateCommandExecutionStage.PostRun
                    });
                    return '';
                },
                powershell(commandArgs: string) {
                    commands.push({
                        type: 'powershell',
                        commandArgs,
                        stage: TemplateCommandExecutionStage.PostRun
                    });
                    return '';
                }
            }
        };

        TemplateEngine.templateDefs = templateDefs;

        let defFileIndex = allTemplatePaths.findIndex(f => f.toLowerCase().endsWith('\\template.def'));
        defFileIndex = (defFileIndex === -1) ? allTemplatePaths.findIndex(f => f.endsWith('.def')) : defFileIndex;
        while (defFileIndex > 0) {
            doT.template(FileSystem.readFileSync(allTemplatePaths[defFileIndex]), this.dotSettings, templateDefs);
            allTemplatePaths.splice(defFileIndex, 1);
            defFileIndex = allTemplatePaths.findIndex(f => f.endsWith('.def'));
        }

        if (outputPath && template.outputPath && !path.isAbsolute(template.outputPath)) {
            outputPath = path.join(outputPath, template.outputPath);
        } else if (template.outputPath && path.isAbsolute(template.outputPath)) {
            outputPath = template.outputPath;
        }

        for (let i = 0; i < allTemplatePaths.length; i++) {
            const source = allTemplatePaths[i];
            const fileContents = fs.readFileSync(source);
            const directive = template.directives?.find(d => d.name === path.basename(source));
            let destination;
            if (template.type === TemplateType.ItemTemplate) {
                const ext = path.extname(source);
                outputPath = !outputPath?.toLowerCase().endsWith(ext)
                    ? `${outputPath}${ext}`
                    : outputPath;
                destination = source.replace(source, outputPath);
            } else {
                destination = source.replace(templatePath, outputPath);
            }
            
            let templateFn;
            try {
                templateFn = (!directive || directive.processFile)
                    ? doT.template(fileContents.toString(), this.dotSettings, templateDefs)
                    : null;
            } catch (error) {
                Quickly.error(`Error while trying to parse the template file at ${source}, error message: ${error.message}`);
                throw error;
            }

            let match;
            while (match = this.fileNameRegex.exec(destination)) {
                let key = match[1];
                interactives[key] = interactives[key] || {
                    type: 'prompt',
                    message: `Please enter a file name for ${key}`
                };
            }

            result.files.push({
                destination,
                source,
                fileContents,
                templateFn
            });
        }

        result.template = template;
        result.sourcePath = templatePath;
        result.outputPath = outputPath;
        result.commands = commands;
        result.interactives = interactives;

        return result;
    }

    private static async executeCommands(templateContext: TemplateContext, stage: TemplateCommandExecutionStage): Promise<void> {
        const commands = templateContext.commands.filter(s => s.stage === stage);
        for (let i = 0; i < commands.length; i++) {
            const command = commands[i];

            const rootPath = FileSystem.stats(templateContext.outputPath).isDirectory()
                ? templateContext.outputPath
                : path.dirname(templateContext.outputPath);

            if (TemplateEngine.templateDefs) {
                command.commandArgs = doT.template(command.commandArgs, this.dotSettings, TemplateEngine.templateDefs)(templateContext);
            }
            
            switch (command.type) {
                case 'dotnet': {
                    command.output = await TerminalManager.showTerminal(rootPath)
                        .then(async terminal => { 
                            return await terminal.run(new TerminalCommand(`dotnet ${command.commandArgs}`))
                                .then(async tc => tc.output);                      
                        });
                }
                    break;
                case 'npm': {
                    command.output = await TerminalManager.showTerminal(rootPath)
                        .then(async terminal => { 
                            return await terminal.run(new TerminalCommand(`npm ${command.commandArgs}`))
                                .then(async tc => tc.output);                      
                        });
                }
                    break;
                case 'powershell': {
                    command.output = await TerminalManager.showTerminal(rootPath)
                        .then(async terminal => { 
                            return await terminal.run(new TerminalCommand(`${command.commandArgs}`))
                                .then(async tc => tc.output);                      
                        });
                }
                    break;
            }
        }
    }

    private static async buildTemplateContext(templateAnalysis: TemplateAnalysis, ...object: any): Promise<TemplateContext> {
        const result = new TemplateContext();
        const interactives = templateAnalysis.interactives;
        const templateInputs = Object.keys(interactives);
        const iterator = templateInputs[Symbol.iterator]();
        let item = iterator.next();

        while (!item.done) {
            if (result.userCanceled) { 
                item.done = true;
                continue; 
            }

            const key = item.value;
            const interactive = interactives[key];
            switch (interactive.type) {
                case 'prompt': {
                    result.parameters[key] = result.parameters[key] || await Quickly.ask(interactive.message);
                    if (!result.parameters[key]) { result.userCanceled = true; }
                }
                    break;
                case 'select': {
                    result.parameters[key] = result.parameters[key] || await Quickly.pick(interactive.message, ...interactive.options?.items)
                        .then(item => item?.label || undefined);
                    if (!result.parameters[key]) { result.userCanceled = true; }
                }
                    break;
                case 'confirm': {
                    result.parameters[key] = (result.parameters[key] === undefined)
                        ? await Quickly.pickBoolean(interactive.message, 'Yes', 'No')
                        : result.parameters[key];
                    if (!result.parameters[key] === undefined) { result.userCanceled = true; }
                }
                    break;
                case 'cdsConnection': {
                    let config;

                    if (!interactive.message) {
                        config = (await DiscoveryRepository.getOrgConnections(ExtensionContext.Instance, true))
                            .find(c => c.name === interactive.options?.connection);
                    }

                    result.parameters[key] = config || await Quickly.pickCdsOrganization(ExtensionContext.Instance, interactive.message || "Choose a CDS organization", true);
                    if (!result.parameters[key]) { result.userCanceled = true; }
                }
                    break;
                case 'cdsWebApi': {
                    let config = interactive.options?.connection ? result[interactive.options?.connection] : undefined;
                    config = config || await Quickly.pickCdsOrganization(ExtensionContext.Instance, interactive.message || `Pick CDS Organization that contains ${key}`, true);

                    if (config) {
                        result.parameters[key] = result.parameters[key] || new CdsWebApi.WebApiClient(config);                    
                    }

                    if (!result.parameters[key]) { result.userCanceled = true; }
                }
                    break;
                case 'cdsSolution': {
                    let config = interactive.options?.connection ? result[interactive.options?.connection] : undefined;
                    config = config || await Quickly.pickCdsOrganization(ExtensionContext.Instance, `Pick CDS Organization that contains ${key}`, true);

                    if (!interactive.message) {
                        const api = new ApiRepository(config);
                        result.parameters[key] = await api.retrieveSolution(`Uniquename='${interactive.options?.solution}'`);
                    }

                    result.parameters[key] = result.parameters[key] || await Quickly.pickCdsSolution(config, interactive.message, true);                    
                    if (!result.parameters[key]) { result.userCanceled = true; }
                }
                    break;
                case 'cdsEntity': {
                    let config = interactive.options?.connection ? result[interactive.options?.connection] : undefined;
                    config = config || await Quickly.pickCdsOrganization(ExtensionContext.Instance, `Pick CDS Organization that contains ${key}`, true);

                    if (!interactive.message) {
                        const api = new MetadataRepository(config);
                        result.parameters[key] = await api.retrieveEntityByLogicalName(interactive.options?.entity);
                    }

                    let solution = interactive.options?.solution ? result[interactive.options?.solution] : undefined;
                    
                    result.parameters[key] = result.parameters[key] || (await Quickly.pickCdsSolutionComponent(config, solution, CdsSolutions.SolutionComponent.Entity, undefined, interactive.message)).component;
                    if (!result.parameters[key]) { result.userCanceled = true; }
                }
                    break;
                case "cdsFake": { 
                    let config = interactive.options?.connection ? result[interactive.options?.connection] : undefined;
                    let entity = interactive.options?.entity ? result[interactive.options?.entity] : undefined;

                    result.parameters[key] = await vscode.commands.executeCommand(cs.cds.data.getFaker, config, entity);
                }
                    break;
            }

            item = iterator.next();
        }

        result.parameters = Object.assign(result.parameters, ...object);
        result.parameters = Object.assign(result.parameters, 
            ExtensionConfiguration.getConfigurationValueOrDefault(cs.cds.configuration.templates.templateParameters, {}));

        result.sourcePath = templateAnalysis.sourcePath;
        result.outputPath = templateAnalysis.outputPath.replace(this.fileNameRegex, (match, key) => result.parameters[key] || match);
        result.commands = templateAnalysis.commands;

        return result;
    }
}