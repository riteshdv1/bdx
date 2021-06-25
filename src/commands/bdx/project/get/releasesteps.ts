import { flags, SfdxCommand } from "@salesforce/command";
import child_process = require("child_process");
import util = require('util');
import fs = require("fs");
import ProjectGetPackagePath from "./packagepath";
import ProjectGetMdapiPath from "./mdapipath";
import ProjectGetVlocityPath from "./vlocitypath";
import ProjectGetApexScriptPath from "./apexscriptpath";
import GitCompare from "./../../git/compare";
const exec = util.promisify(child_process.exec);
//import colors = require("colors");
//const excludePathObj = new ProjectGetExcludePath(this.argv,this.config)

export default class ProjectGetReleaseSteps extends SfdxCommand {
  public static description = "Generates release steps";
  protected static requiresUsername = false;
  protected static requiresProject = true;

  protected static flagsConfig = {
    fromcommit: flags.string({
      char: "f",
      description: "From commit id",
      required: true
    }),
    tocommit: flags.string({
      char: "t",
      description: "To commit id",
      required: true
    }),
    haschanged: flags.boolean({
      char: "c",
      description:
        "Use this flag to display the changed folders only",
      required: false
    }),
    filepath: flags.string({
      char: "d",
      description:
        "Use this flag to store json response in a file",
      required: false
    })
  };

  public async run(): Promise<any> {
    //this.ux.startSpinner("Getting release steps");
    /*let gitCompareResult = await GitCompare.run(['-f',this.flags.fromcommit,'-t',this.flags.tocommit,'-c','--json']);
    let packagepathResult = await ProjectGetPackagePath.run([]);
    let mdapipathResult = await ProjectGetMdapiPath.run([]);
    let vlocitypathResult = await ProjectGetVlocityPath.run([]);
    let apexscriptpathResult = await ProjectGetApexScriptPath.run([]);*/

    //console.log(colors.blue(JSON.stringify(gitCompareResult)))
   /* let values = await Promise.all([
     // await this.getGitCompare(),
      exec(`sfdx bdx:git:compare -f ${this.flags.fromcommit} -t ${this.flags.tocommit} -c --json`),
      exec(`sfdx bdx:project:get:packagepath --json`),
      exec(`sfdx bdx:project:get:mdapipath --json`),
      exec(`sfdx bdx:project:get:vlocitypath --json`),
      exec(`sfdx bdx:project:get:apexscriptpath --json`)
    ])*/

    let values = await Promise.all([
      GitCompare.run(['-f',this.flags.fromcommit,'-t',this.flags.tocommit,'-c']),
      ProjectGetPackagePath.run([]),
      ProjectGetMdapiPath.run([]),
      ProjectGetVlocityPath.run([]),
      ProjectGetApexScriptPath.run([])
     ])
    let compareResultPaths = values[0].map(item => item.path)
    let packPaths = values[1]
    let mdapiPaths = values[2]
    let vlocityPaths = values[3]
    let apexScriptPaths = values[4]

    /*let compareResultPaths = JSON.parse(values[0].stdout).result.map(item => item.path)
    let packPaths = JSON.parse(values[1].stdout).result
    let mdapiPaths = JSON.parse(values[2].stdout).result
    let vlocityPaths = JSON.parse(values[3].stdout).result
    let apexScriptPaths = JSON.parse(values[4].stdout).result*/

    let steps = await Promise.all([
      this.getPackageSteps("packageinstall", compareResultPaths, packPaths),
      this.getMdapiSteps("mdapi", compareResultPaths, mdapiPaths),
      this.getSteps("vlocitydeploy", compareResultPaths, vlocityPaths),
      this.getSteps("apex", compareResultPaths, apexScriptPaths)
    ]).then((data) => {
      return data[0].concat(data[1]).concat(data[2]).concat(data[3])
    }).catch((error) => {
      console.log(JSON.stringify(error));
    })

    let result = {
      steps: steps
    }

    if (this.flags.filepath) {
      this.createReleaseStepsFile(this.flags.filepath, result)
    }
    return result;
  }

  //Helper functions start here
  async getPackageSteps(type, compareResultPaths, Paths) {
    let result = []
    for (let element of Paths) {
      if (compareResultPaths.indexOf(element.path) > -1) {
        let packObj = {
          type: type,
          unlockedpackagename: element.name,
          unlockedpackageversion: element.version
        }
        result.push(packObj)
      }
    }
    return result;
  }

  async getMdapiSteps(type, compareResultPaths, Paths) {
    let result = []
    for (let element of Paths) {
      if (compareResultPaths.indexOf(element.path) > -1) {
        let mdapiObj = {
          type: type,
          description: element.name,
          path: element.path
        }
        result.push(mdapiObj)
      }
    }
    return result;
  }

  async getSteps(type, compareResultPaths, Paths) {
    let result = []
    for (let element of Paths) {
      if (compareResultPaths.indexOf(element.path) > -1) {
        element.type = type
        result.push(element)
      }
    }
    return result;
  }

  async createReleaseStepsFile(filepath, jsonInput) {
    fs.writeFile(
      "./" + filepath,
      JSON.stringify(jsonInput),
      function (err) {
        if (err) console.log(err);
      }
    );
  }

  async getGitCompare() {
    if (this.flags.haschanged) {
      return exec(`sfdx bdx:git:compare -f ${this.flags.fromcommit} -t ${this.flags.tocommit} -c --json`)
    }
    return exec(`sfdx bdx:git:compare -f ${this.flags.fromcommit} -t ${this.flags.tocommit} --json`)
  }
}
