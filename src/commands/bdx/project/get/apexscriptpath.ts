import { flags, SfdxCommand } from "@salesforce/command";
import colors = require("colors");
import child_process = require("child_process");

export default class ProjectGetApexScriptPath extends SfdxCommand {
  public static description = "Retrieves path of all the anonymous apex scripts";
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
    this.ux.startSpinner("Retrieving script paths");
    let allPaths = await this.a1()
    let allFolders = await this.getFolders(allPaths)
    if (!this.flags.json) {
      this.showTable(allFolders);
    }
    return Promise.resolve(allFolders);
  }

  showTable(mdapiPaths) {
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

  a1() {
    let command = "find . -name *.apex";
    let allPaths = child_process.spawnSync("bash", ["-c", command], { encoding: "utf8" });
    if (allPaths.stderr) {
      return Promise.reject(allPaths.stderr);
    } else if (allPaths.error) {
      return Promise.reject(allPaths.error);
    } else {
      let res = (allPaths.stdout + "").split("\n")
      res = res.splice(0, res.length - 1)
      return Promise.resolve(res);
    }
  }

  getFolders(allPaths) {
    let allFolders = []
    for (let pathStr of allPaths) {
      let filteredPath = this.filterPaths(pathStr)
      allFolders.push(filteredPath)
    }
    return allFolders
  }

  filterPaths(pathStr) {
    pathStr = pathStr.replace("\.\/", "")
    const tempArr = pathStr.split("/");
    var pathObj = {
      name: tempArr[tempArr.length - 1].replace("\.apex", ""),
      path: pathStr
    };
    return pathObj;
  }
}
