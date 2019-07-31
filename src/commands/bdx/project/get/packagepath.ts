import { flags, SfdxCommand } from "@salesforce/command";
import colors = require("colors");
import fs = require("fs");

export default class ProjectGetPackagePath extends SfdxCommand {
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

    this.ux.startSpinner("Retrieving package list");

    var readObj=await this.r1()
    let paths=[]
    for(var item of readObj){
      if(item.package!=undefined 
        && item.path!=undefined 
        && item.package!=''
        && item.path!=''){
        var itemObj = {
          name: item.package,
          path: item.path
        };
        paths.push(itemObj)
      }
    }
    if (!this.flags.json) this.showTable(paths);
    return Promise.resolve(paths);
  }
  async showTable(paths) {
    var responseArrayObject = [];
    for (var element of paths) {
      var coloredElement = {
        name: colors.yellow(element.name),
        path: colors.yellow(element.path)
      };
      responseArrayObject.push(coloredElement);
    }
    this.ux.table(responseArrayObject, this.tableColumnData);
  }
  async r1(){
    return JSON.parse(fs.readFileSync("sfdx-project.json", "utf8")).packageDirectories
  }
}
