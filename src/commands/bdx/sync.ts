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
    })
  };

  public async run(): Promise<any> {
    this.ux.startSpinner("Running org sync");
    var sourceOrg = this.flags.source;
    interface mapData {
      sizeOfDependency: number;
      packageList: Array<any>;
    }

    var inputCommandArray = [];
    var a1  = await exec(`sfdx force:package:installed:list -u ${sourceOrg} --json`)
    var getAllPackages=JSON.parse(a1.stdout).result;
    for(var item of getAllPackages ){
      var subpack=exec(`sfdx force:data:soql:query -u ${sourceOrg} -t -q "SELECT Id,Dependencies FROM SubscriberPackageVersion WHERE Id='${item.SubscriberPackageVersionId}'" --json`)
      inputCommandArray.push(subpack);
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
    var steps=[]
    for(var item of queryResultMap){
       for(var packageId of item.packageList){
         const packageObj= getAllPackages.find(function(element) {
          return element.SubscriberPackageVersionId==packageId
        })
        var sequenceObj={
          "type": "createunlockedpackage",
          "unlockedpackagename": packageObj.SubscriberPackageName,
        }
        steps.push(sequenceObj)
       }
    }
    var result={steps}
    return result;
}
}
