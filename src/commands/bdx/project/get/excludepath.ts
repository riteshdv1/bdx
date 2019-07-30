import { flags, SfdxCommand } from "@salesforce/command";
import colors = require("colors");
import child_process = require("child_process");

export default class ProjectGetExcludePath extends SfdxCommand {
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
      var values=await Promise.all([this.s1(),this.s2()])
      let packagePath=JSON.parse(values[0])
      let diff=values[1]

      let dxExcludePaths=[]
      if (diff.stderr) {
        return Promise.reject(diff.stderr);
      } else if (diff.error) {
        return Promise.reject(diff.error);
      } else {
        const resultArr = (diff.stdout + "").split("\n");
        for(var resObj of resultArr){
          var matchArr = resObj.match(/(.*\/)(.*)(\/main\/default)/);
          var pathObj = { name: "", path: "" };
          if (matchArr != null && packagePath.result.filter(item=>item.path.includes(matchArr[2])).length==0) {
            pathObj = {
              name: matchArr[2],
              path: matchArr[1] + matchArr[2]
            };
            dxExcludePaths.push(pathObj)
          }
        }
      }
      if (!this.flags.json) this.showTable(dxExcludePaths);
      return Promise.resolve(dxExcludePaths);
  }
  async showTable(dxExcludePaths) {
    var responseArrayObject = [];
    for (var element of dxExcludePaths) {
      var coloredElement = {
        name: colors.yellow(element.name),
        path: colors.yellow(element.path)
      };
      responseArrayObject.push(coloredElement);
    }
    this.ux.table(responseArrayObject, this.tableColumnData);
  }
  async s1(){
    return child_process.execSync(`sfdx bdx:project:get:packagepath --json`,{ encoding: "utf8"})
  }
  async s2(){
    let command = "find . -name default";
    return child_process.spawnSync("bash", ["-c", command], { encoding: "utf8"})
  }
}
