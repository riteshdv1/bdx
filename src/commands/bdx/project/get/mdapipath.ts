import { flags, SfdxCommand } from "@salesforce/command";
import colors = require("colors");
import child_process = require("child_process");

export default class ProjectGetMdapiPath extends SfdxCommand {
  public static description = "Retrieves list of commits between two commits";
  protected static requiresUsername = false;
  protected static requiresProject = true;
  protected tableColumnData = ["name", "path"];

  protected static flagsConfig = {
    ignorefolder: flags.string({
      char: "i",
      description: "Mention a folder that you don't wish to track",
      required: false
    })
  };

  public async run(): Promise<any> {
    this.ux.startSpinner("Retrieving exclude list");
    var diff=await this.m1()
    if (diff.stderr) {
      return Promise.reject(diff.stderr);
    } else if (diff.error) {
      return Promise.reject(diff.error);
    } else {
      const res = (diff.stdout + "").split("\n");
      let mdapiPaths = res.map(function(element) {
        const tempArr = element.split("/");
        var pathObj = {
          name: tempArr[tempArr.length - 2],
          path: element.replace("package.xml", "")
        };
        return pathObj;
      });
      if (!this.flags.json) this.showTable(mdapiPaths);
      return Promise.resolve(mdapiPaths);
    }
  }
  async showTable(mdapiPaths) {
    var responseArrayObject = [];
    for (var element of mdapiPaths) {
      var coloredElement = {
        name: colors.yellow(element.name),
        path: colors.yellow(element.path)
      };
      responseArrayObject.push(coloredElement);
    }
    this.ux.table(responseArrayObject, this.tableColumnData);
  }
  async m1(){
    let command = "find . -name package.xml";
    return child_process.spawnSync("bash", ["-c", command], { encoding: "utf8"});
  }
}
