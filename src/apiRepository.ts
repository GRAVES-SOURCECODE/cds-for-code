import * as vscode from 'vscode';
import { DynamicsWebApiClient } from "./DynamicsWebApi/DynamicsWebApi";

export default class ApiRepository
{
    public static wireUpCommands(context: vscode.ExtensionContext) {
        // now wire a command into the context
        context.subscriptions.push(
            vscode.commands.registerCommand('cloudSmith.getSolutionsCommand', async (options:DynamicsWebApi.Config) => { // Gets a list of organizations in a connection
                const api = new ApiRepository(options);
                
                return await api.retrieveSolutions();
            })
        );
    }

    private config:DynamicsWebApi.Config;

    public constructor (config:DynamicsWebApi.Config)
    {
        this.config = config;
        this.webapi = new DynamicsWebApiClient(config);
    }

    private webapi: DynamicsWebApiClient;

    public async whoAmI() : Promise<any>
    {
        return await this.webapi.executeUnboundFunction('WhoAmI');
    }

    public retrieveSolutions<T>() : Promise<T[]> {
        let request:DynamicsWebApi.RetrieveMultipleRequest = {
            collection: "solutions",
            filter: "isvisible eq true",
            orderBy: ["uniquename"]
        };

        return this.webapi.retrieveAllRequest(request)
            .then(response => response.value);
    }

    public retrievePluginAssemblies<T>(solutionId:string) : Promise<T[]> {
        let request:DynamicsWebApi.RetrieveMultipleRequest = {
            collection: "pluginassemblies",
            //filter: "ishidden.Value eq false" + (solutionId ? ` and SolutionId eq ${solutionId}` : ""),
            filter: (solutionId ? `SolutionId eq ${solutionId}` : null),
            orderBy: ["name"]
        };

        return this.webapi.retrieveAllRequest(request)
            .then(response => {
                return response.value;
            });
    }
}