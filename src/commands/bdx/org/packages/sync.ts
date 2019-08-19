import { flags, SfdxCommand } from "@salesforce/command";
import child_process = require("child_process");
import util = require("util");
import colors = require("colors");

const exec = util.promisify(child_process.exec);

export default class OrgPackagesSync extends SfdxCommand {
  public static description = "Sync packages of two orgs";
  protected static requiresUsername = false;
  protected tableColumnData = ["packageName", "subscriberVersionId", "status"];

  protected static flagsConfig = {
    source: flags.string({
      char: "s",
      description: "name of source org",
      required: true
    }),
    target: flags.string({
      char: "t",
      description: "name of target org",
      required: true
    }),
    packageignore: flags.string({
      char: "p",
      description:
        "comma separated list of package names or subscriber id to skip installation",
      required: false
    })
  };

  public async run(): Promise<any> {
    this.ux.startSpinner("Running org sync");
    var sourceOrg = this.flags.source;
    var targetOrg = this.flags.target;
    var packageIgnoreString = this.flags.packageignore;

    interface responseClass {
      packageName: string;
      subscriberVersionId: string;
      status: String;
      isInstalled: Boolean;
    }
    var resultArray = [];

    const compareResultArray = await exec(
      `sfdx bdx:org:packages:compare -s ${sourceOrg} -t ${targetOrg} -p ${packageIgnoreString} --json`
    )
      .then(data => {
        var differenceArray = JSON.parse(data.stdout).result.filter(
          item => item.isSame == false
        );
        return differenceArray;
      })
      .catch(error => {
        this.ux.log(colors.red(JSON.stringify(error.stderr)));
        return error.stdout;
      });
    var inputCommandArray = [];
    for (var item of compareResultArray) {
      if (
        item.sourceSubscriberVersionId != null &&
        item.sourceSubscriberVersionId != "--None--"
      ) {
        var outputObj: responseClass = {
          packageName: item.packageName,
          subscriberVersionId: item.sourceSubscriberVersionId,
          status: "PENDING",
          isInstalled: false
        };
        resultArray.push(outputObj);
        inputCommandArray.push(
          exec(
            `sfdx force:data:soql:query -u ${sourceOrg} -t -q "SELECT Id,Dependencies FROM SubscriberPackageVersion WHERE Id='${
            item.sourceSubscriberVersionId
            }'" --json`
          )
        );
      }
    }
    var queryResultMap = await Promise.all(inputCommandArray)
      .then(values => {
        var responseArray = [];
        for (var val of values) {
          var parsedVal = JSON.parse(val.stdout).result.records[0];
          const execStr = parsedVal.Id;
          const packageName = compareResultArray.find(item => item.sourceSubscriberVersionId == execStr).packageName
          if (
            parsedVal.Dependencies != null &&
            parsedVal.Dependencies.ids.length
          ) {
            var arrObj1 = {
              sizeOfDependency: parsedVal.Dependencies.ids.length,
              packageId: execStr,
              packageName: packageName
            };
            responseArray.push(arrObj1);
          } else {
            var arrObj2 = {
              sizeOfDependency: 0,
              packageId: execStr,
              packageName: packageName
            };
            responseArray.push(arrObj2);
          }
        }

        //Sort the array based on size in increasing order
        responseArray.sort(function (a, b) {
          return a.sizeOfDependency - b.sizeOfDependency;
        });
        return responseArray;
        //return this.installPackages(responseArray);
      })
      .catch(error => {
        this.ux.log(error);
        return null;
      });

    this.ux.log(colors.blue("installable packages are : "));
    for (const packageObj of queryResultMap) {
      this.ux.log(colors.blue(packageObj.packageName))
    }

    for (const packageObj of queryResultMap) {
      this.ux.startSpinner(colors.yellow("installing package : " + packageObj.packageName))
      await exec(`sfdx force:package:install -u ${targetOrg} -p ${packageObj.packageId} -w 20 -r`)
      this.ux.log(colors.green(packageObj.packageName))
    }

    return resultArray;
  }
}
