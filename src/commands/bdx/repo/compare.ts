import { flags, SfdxCommand } from "@salesforce/command";
import colors = require("colors");
import child_process = require("child_process");

export default class RepoCompare extends SfdxCommand {
  public static description = "Retrieves list of commits between two commits";
  protected static requiresUsername = false;
  protected static requiresProject = true;
  protected tableColumnData = ["path","isMatch"];

  protected static flagsConfig = {
    sourcerepo: flags.string({
      char: "s",
      description: "Source repo folder path",
      required: false
    }),
    targetrepo: flags.string({
        char: "t",
        description: "Target repo folder path",
        required: false
    })
  };

  public async run(): Promise<any> {
    this.ux.startSpinner("Comparing");
    let sourceFiles= this.m1(this.flags.sourcerepo)
    let targetFiles= this.m1(this.flags.targetrepo)
    //this.ux.log(colors.blue(JSON.stringify(sourceFiles)))
    //this.ux.log(colors.yellow(JSON.stringify(targetFiles)))
    let sourceArr=(sourceFiles.stdout + "").split("\n")
    let targetArr=(targetFiles.stdout + "").split("\n")
    let finalArr=[];
    for(let spath of sourceArr){
        let snameArr = spath.split("/");
        let sname = snameArr[snameArr.length-1]
        let pathObj = {
            path:spath,
            isMatch:false
          };
        for(let fpath of targetArr){
            let fnameArr = fpath.split("/");
            let fname = fnameArr[fnameArr.length-1]
            if(sname==fname){
                pathObj.isMatch=true
                break;
            }
            //this.ux.log(colors.yellow(JSON.stringify(fpath)))
        }

        if(!pathObj.isMatch){
            finalArr.push(pathObj)
        }
    }
    this.showTable(finalArr);
  }
  async showTable(finalArr) {
    var responseArrayObject = [];
    for (var element of finalArr) {
        if(element.isMatch){
            var coloredElement = {
                path: colors.green(element.path),
                isMatch: colors.green(element.isMatch)
              };
        }else{
            var coloredElement = {
                path: colors.red(element.path),
                isMatch: colors.red(element.isMatch)
              };
        }

      responseArrayObject.push(coloredElement);
    }
    this.ux.table(responseArrayObject, this.tableColumnData);
  }
  m1(directoryPath) {
    let command = "find "+directoryPath;
    return child_process.spawnSync("bash", ["-c", command], { encoding: "utf8" });
  }
}
