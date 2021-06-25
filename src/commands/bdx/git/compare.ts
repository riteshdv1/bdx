import { flags, SfdxCommand } from "@salesforce/command";
import child_process = require("child_process");
//import util = require('util');
//const exec = util.promisify(child_process.exec);
import fs = require("fs");
import ProjectGetPackagePath from "./../project/get/packagepath";
import ProjectGetMdapiPath from "./../project/get/mdapipath";
import ProjectGetExcludePath from "./../project/get/excludepath";
import ProjectGetVlocityPath from "./../project/get/vlocitypath";
import ProjectGetApexScriptPath from "./../project/get/apexscriptpath";

export default class GitCompare extends SfdxCommand {
  public static description = "Retrieves list of commits between two commits";
  protected static requiresUsername = false;
  protected static requiresProject = true;
  protected static resultOutput: any[] = [];
  protected static ignoreStory: string = "";
  protected static commitFrom: string = "";
  protected static commitTo: string = "";

  protected tableColumnData = ["name", "path"];


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
    ignorestory: flags.string({
      char: "i",
      description:
        "Mention a story or comma separated list of stories that needs to be out of list in format BT-XXXX",
      required: false
    }),
    haschanged: flags.boolean({
      char: "c",
      description:
        "Use this flag to display the changed folders only",
      required: false
    }),
    showstoriesonly: flags.boolean({
      char: "s",
      description:
        "Use this flag to list the stories only",
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

    this.ux.startSpinner("Retrieving commit list");

    GitCompare.commitFrom = this.flags.fromcommit;
    GitCompare.commitTo = this.flags.tocommit;
    GitCompare.ignoreStory =
      this.flags.ignoreStory != null ? this.flags.ignoreStory.split(",") : null;
    /*var values = await Promise.all([
      exec(`sfdx bdx:project:get:packagepath --json`),
      exec(`sfdx bdx:project:get:mdapipath --json`),
      exec(`sfdx bdx:project:get:excludepath --json`),
      exec(`sfdx bdx:project:get:vlocitypath --json`),
      exec(`sfdx bdx:project:get:apexscriptpath --json`),
      this.loadChangedFiles()
    ])
    let packPath = JSON.parse(values[0].stdout).result
    let mdapiPath = JSON.parse(values[1].stdout).result
    let excludePath = JSON.parse(values[2].stdout).result
    let vlocityPath = JSON.parse(values[3].stdout).result
    let apexScriptPaths = JSON.parse(values[4].stdout).result*/

    let values = await Promise.all([
      ProjectGetPackagePath.run([]),
      ProjectGetMdapiPath.run([]),
      ProjectGetExcludePath.run([]),
      ProjectGetVlocityPath.run([]),
      ProjectGetApexScriptPath.run([]),
      this.loadChangedFiles()
     ])

    let packPath = values[0]
    let mdapiPath = values[1]
    let excludePath = values[2]
    let vlocityPath = values[3]
    let apexScriptPaths = values[4]
    GitCompare.resultOutput = packPath.concat(mdapiPath).concat(excludePath).concat(vlocityPath).concat(apexScriptPaths)

    let lpromise = await this.getFileHistory(values[5])
      .then(result => {
        return this.displayOutput(result)
      });

    if (this.flags.haschanged) {
      lpromise = this.showChangedDirectoriesOnly(lpromise)
    }

    if (this.flags.showstoriesonly) {
      lpromise = this.showStoriesOnly(lpromise)
    }

    if (this.flags.filepath) {
      this.createJsonFile(this.flags.filepath, lpromise)
    }

    return lpromise
  }

  //Helper functions start here
  async loadChangedFiles() {
    var command =
      "GIT diff " +
      GitCompare.commitFrom +
      ".." +
      GitCompare.commitTo +
      " --name-only";

    var diff = child_process.spawnSync("bash", ["-c", command], {
      encoding: "utf8"
    });
    if (diff.stdout != null) {
      return Promise.resolve(("" + diff.stdout).split("\n"));
    } else if (diff.stderr != null) {
      return Promise.reject(diff.stderr);
    } else {
      Promise.reject(diff.error);
    }
  }

  async getFileHistory(changedfiles) {
    return new Promise(function (resolve, reject) {
      let commitHistory = [];
      const processFiles = async () => {
        for (const element of changedfiles) {
          await getHistory(element);
        }
      }

      const getHistory = element => {
        return new Promise((resolve, reject) => {
          if (element.length === 0) {
            Promise.resolve();
            return;
          }
          let commits = [];
          let spawn = require('child_process').spawn;
          let diff = spawn('git', ['log', GitCompare.commitFrom + '..' + GitCompare.commitTo, "--pretty=%H-|-%s", "--", element]);

          diff.stdout.on('data', function (data) {
            commits = commits.concat((data + '').split('\n'));
          });

          diff.on('close', function (code) {
            commits.forEach(commitEntry => {
              if (commitEntry != '') {
                let commitid = commitEntry.split('-|-')[0];
                let subject = commitEntry.split('-|-')[1];
                let jiraMatches = subject.match(/BT-[0-9]*/);
                let jiraItems = [];
                if (jiraMatches != null) {
                  subject.match(/BT-[0-9]*/g).forEach(match => {
                    if (!jiraItems.includes(match)) {
                      jiraItems.push(match);
                    }
                  });
                }
                let commitHistoryItem = {
                  filename: element,
                  commitid: commitid,
                  subject: subject,
                  jiraItems: jiraItems
                }
                commitHistory.push(commitHistoryItem);
              }
            });
            Promise.resolve();
          });

          diff.stderr.on('data', function (data) {
            console.error('stderr1: ' + data);
          });
        });
      }

      processFiles().then(() => {
        resolve(commitHistory);
      })
    });
  }

  async displayOutput(commitHistory) {
    GitCompare.resultOutput.forEach(path => {
      path.result = {
        hasChanged: false,
        commits: [],
        jiraItemsSummary: [],
        changeFileSummary: []
      };
      commitHistory.forEach(commitHistoryItem => {
        if (commitHistoryItem.filename.includes(path.path)) {
          path.result.hasChanged = true;
          path.result.commits.push(commitHistoryItem);
          if (!path.result.changeFileSummary.includes(commitHistoryItem.filename)) {
            path.result.changeFileSummary.push(commitHistoryItem.filename);
          }
          commitHistoryItem.jiraItems.forEach(jiraItem => {
            if (!path.result.jiraItemsSummary.includes(jiraItem)) {
              path.result.jiraItemsSummary.push(jiraItem);
            }
          })
        }
      })
    });
    return GitCompare.resultOutput
  }

  showStoriesOnly(lpromise) {
    var tempArr = []
    for (const element of lpromise) {
      if (element.result.jiraItemsSummary.length > 0)
        for (const innerElement of element.result.jiraItemsSummary) {
          if (tempArr.indexOf(innerElement) == -1) {
            tempArr.push(innerElement)
          }
        }
    }
    return tempArr;
  }

  showChangedDirectoriesOnly(lpromise) {
    var tempArr = []
    for (const element of lpromise) {
      if (element.result.hasChanged)
        tempArr.push(element)
    }
    this.ux.table(tempArr, this.tableColumnData);
    return tempArr;
  }

  async createJsonFile(filepath, lpromise) {
    fs.writeFile(
      "./" + filepath,
      JSON.stringify(lpromise),
      function (err) {
        if (err) console.log(err);
      }
    );
  }
}
