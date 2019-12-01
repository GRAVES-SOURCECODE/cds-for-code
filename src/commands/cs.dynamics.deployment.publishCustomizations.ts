import { DynamicsWebApi } from '../api/Types';
import ApiRepository from '../repositories/apiRepository';
import Quickly from '../core/Quickly';
import { Utilities } from '../core/Utilities';
import ExtensionContext from '../core/ExtensionContext';

/**
 * This command can be invoked by the Command Palette or the Dynamics TreeView and adds a solution component to a solution.
 * @export run command function
 * @param {vscode.Uri} [file] that invoked the command
 * @returns void
 */
export default async function run(config?: DynamicsWebApi.Config, components?:{type:DynamicsWebApi.SolutionComponent, id:string}[]) {
    config = config || await Quickly.pickCdsOrganization(ExtensionContext.Instance, "Choose a Dynamics 365 Organization", true);
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
                parameterXml += `<webresource>{${Utilities.Guid.TrimGuid(c.id)}}</webresource>`;
            }
        });
        
        parameterXml += "</webresources></importexportxml>";

        await api.publishXml(parameterXml);
        await Quickly.inform("Components were published successfully");
    }
}