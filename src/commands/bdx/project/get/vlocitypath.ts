import { SfdxCommand } from "@salesforce/command";

export default class ProjectGetVlocityPath extends SfdxCommand {
  public static description = "Retrieves list of vlocity deployable folders";
  protected static requiresUsername = false;
  protected static requiresProject = true;

  public async run(): Promise<any> {

    this.ux.startSpinner("Retrieving vlocity path");

    return await this.getVlocityPath();
  }

  getVlocityPath() {
    let pathArr = [];
    var pathObj = {
      name: "vlocity-src",
      path: "vlocity-src"
    };
    pathArr.push(pathObj)
    return pathArr
  }
}
