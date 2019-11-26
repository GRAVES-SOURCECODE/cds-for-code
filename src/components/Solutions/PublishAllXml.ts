import * as vscode from 'vscode';
import * as cs from '../../cs';
import IContributor from '../../core/CommandBuilder';
import { DynamicsWebApi } from '../../webapi/Types';
import ApiRepository from '../../repositories/apiRepository';
import Quickly from '../../core/Quickly';
import Utilities from '../../core/Utilities';

export default class PublishCustomizations implements IContributor {
    public contribute(context: vscode.ExtensionContext, wconfig: vscode.WorkspaceConfiguration) {
        
        context.subscriptions.push(vscode.commands.registerCommand(cs.dynamics.deployment.publishCustomizations, async (config?: DynamicsWebApi.Config, components?:{type:DynamicsWebApi.SolutionComponent, id:string}[]) => {
            
            config = config || await Quickly.pickDynamicsOrganization(context, "Choose a Dynamics 365 Organization", true);
            if (!config) { return; }

            // this operation might run long, we need a longer timeout here
            config.timeout = (1000 * 30); // 30 seconds

            const api = new ApiRepository(config);

            if (!components) {
                await api.publishAllXml();
                await Quickly.inform('All customizations published successfully');
            } else {
                let parameterXml:string = "<importexportxml><webresources>";
                
                components.forEach(c => {
                    if (c.type === DynamicsWebApi.SolutionComponent.WebResource) {
                        parameterXml += `<webresource>{${Utilities.TrimGuid(c.id)}}</webresource>`;
                    }
                });
                
                parameterXml += "</webresources></importexportxml>";

                await api.publishXml(parameterXml);

                await Quickly.inform("Components were published successfully");
            }

        }));
    }
}
