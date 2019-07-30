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

    interface mapData {
      sizeOfDependency: number;
      packageList: Array<any>;
    }
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
        var responseArray: mapData[] = new Array();
        for (var val of values) {
          var parsedVal = JSON.parse(val.stdout).result.records[0];
          const execStr = parsedVal.Id;

          if (
            parsedVal.Dependencies != null &&
            parsedVal.Dependencies.ids.length
          ) {
            var checkIndex = responseArray
              .map(function(item) {
                return item.sizeOfDependency;
              })
              .indexOf(parsedVal.Dependencies.ids.length);

            if (checkIndex == -1) {
              var tempArr = new Array<any>();
              tempArr.push(execStr);
              var mapObj: mapData = {
                sizeOfDependency: parsedVal.Dependencies.ids.length,
                packageList: tempArr
              };
              responseArray.push(mapObj);
            } else {
              responseArray[checkIndex].packageList.push(execStr);
            }
          } else {
            var checkIndex = responseArray
              .map(function(item) {
                return item.sizeOfDependency;
              })
              .indexOf(0);
            if (checkIndex == -1) {
              var tempArr = new Array<any>();
              tempArr.push(execStr);
              var mapObj: mapData = {
                sizeOfDependency: 0,
                packageList: tempArr
              };
              responseArray.push(mapObj);
            } else {
              responseArray[checkIndex].packageList.push(execStr);
            }
          }
        }

        //Sort the array based on size in increasing order
        responseArray.sort(function(a, b) {
          return a.sizeOfDependency - b.sizeOfDependency;
        });
        return responseArray;
        //return this.installPackages(responseArray);
      })
      .catch(error => {
        this.ux.log(error);
        return null;
      });

    for (const outerObj of queryResultMap) {
      var installArray = [];
      var installationProgress = [];
      for (const innerObj of outerObj.packageList) {
        const execRes = await exec(
          `sfdx force:package:install -u ${targetOrg} -p ${innerObj} --json`
        );
        installArray.push(JSON.parse(execRes.stdout).result);
        var progObj = {
          subscriberVersionId: innerObj,
          status: false
        };
        installationProgress.push(progObj);
      }
      //wait for the installation to complete
      while (true) {
        for (const instObj of installArray) {
          await exec(
            `sfdx force:package:install:report -i ${
              instObj.Id
            } -u ${targetOrg} --json`
          )
            .then(result => {
              const statusReport = JSON.parse(result.stdout);
              if (
                statusReport.status == 0 &&
                statusReport.result.Status == "SUCCESS"
              ) {
                installationProgress[
                  installationProgress
                    .map(item => item.subscriberVersionId)
                    .indexOf(instObj.SubscriberPackageVersionKey)
                ].status = true;
                resultArray[
                  resultArray
                    .map(item => item.subscriberVersionId)
                    .indexOf(instObj.SubscriberPackageVersionKey)
                ].isInstalled = true;
              }
              resultArray[
                resultArray
                  .map(item => item.subscriberVersionId)
                  .indexOf(instObj.SubscriberPackageVersionKey)
              ].status = statusReport.result.Status;
            })
            .catch(error => {
              const statusReport = JSON.parse(error.stderr);
              installationProgress[
                installationProgress
                  .map(item => item.subscriberVersionId)
                  .indexOf(instObj.SubscriberPackageVersionKey)
              ].status = true;
              resultArray[
                resultArray
                  .map(item => item.subscriberVersionId)
                  .indexOf(instObj.SubscriberPackageVersionKey)
              ].status = statusReport.message;
            });
        }
        await this.delay(300);
        if (installationProgress.map(item => item.status).indexOf(false) == -1)
          break;
      }
    }
    if (!this.flags.json) {
      await this.showOutput(resultArray);
    }
    return resultArray;
  }
  async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async showOutput(resultArray: any[]) {
    for (var resObj of resultArray) {
      if (resObj.isInstalled) {
        resObj.packageName = colors.green(resObj.packageName);
        resObj.subscriberVersionId = colors.green(resObj.packageName);
        resObj.status = colors.green(resObj.packageName);
      } else {
        resObj.packageName = colors.red(resObj.packageName);
        resObj.subscriberVersionId = colors.red(resObj.packageName);
        resObj.status = colors.red(resObj.packageName);
      }
    }
    this.ux.table(resultArray, this.tableColumnData);
    return Promise.resolve;
  }
}
