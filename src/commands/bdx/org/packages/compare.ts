import { flags, SfdxCommand } from "@salesforce/command";
import child_process = require("child_process");
import util = require("util");
import colors = require("colors");

//import colors = require('colors');
//import * as stripcolor from 'strip-color';

const exec = util.promisify(child_process.exec);

export default class OrgPackagesCompare extends SfdxCommand {
  public static description = "Compare packages of two orgs";
  protected static requiresUsername = false;
  protected tableColumnData = [
    "packageName",
    "sourceSubscriberVersionId",
    "sourceSubscriberVersionNumber",
    "targetSubscriberVersionId",
    "targetSubscriberVersionNumber"
  ];

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
        "comma separated list of package names or subscriber id to skip comparision",
      required: false
    })
  };

  public async run(): Promise<any> {
    this.ux.startSpinner("Running org compare");

    var sourceOrg = this.flags.source;
    var targetOrg = this.flags.target;
    var packageIgnoreList =
      this.flags.packageignore != null
        ? this.flags.packageignore.split(",")
        : null;
    interface responseClass {
      packageName: string;
      packageId: string;
      sourceSubscriberVersionId: string;
      targetSubscriberVersionId: string;
      sourceSubscriberVersionNumber: string;
      targetSubscriberVersionNumber: string;
      isSame: boolean;
    }
    var result = await Promise.all([
      exec(`sfdx force:package:installed:list -u ${sourceOrg} --json`),
      exec(`sfdx force:package:installed:list -u ${targetOrg} --json`)
    ])
      .then(values => {
        const [a1, b1] = values;
        const a = JSON.parse(a1.stdout).result;
        const b = JSON.parse(b1.stdout).result;

        let a_Map = new Map();
        let b_Map = new Map();
        for (let a_key of a) {
          if (
            packageIgnoreList == null ||
            (packageIgnoreList != null &&
              packageIgnoreList.indexOf(a_key.SubscriberPackageId) == -1 &&
              packageIgnoreList.indexOf(a_key.SubscriberPackageName) == -1)
          ) {
            a_Map.set(a_key.SubscriberPackageId, a_key);
          }
        }
        for (let b_key of b) {
          if (
            packageIgnoreList == null ||
            (packageIgnoreList != null &&
              packageIgnoreList.indexOf(b_key.SubscriberPackageId) == -1 &&
              packageIgnoreList.indexOf(b_key.SubscriberPackageName) == -1)
          ) {
            b_Map.set(b_key.SubscriberPackageId, b_key);
          }
        }
        var responseArrayObject = [];

        //Compare package version that are present in both the orgs
        for (var key_b of Array.from(b_Map.keys())) {
          var responseObj: responseClass = {
            packageName: b_Map.get(key_b).SubscriberPackageName,
            packageId: b_Map.get(key_b).SubscriberPackageId,
            sourceSubscriberVersionId: "--None--",
            targetSubscriberVersionId: b_Map.get(key_b)
              .SubscriberPackageVersionId,
            sourceSubscriberVersionNumber: "--None--",
            targetSubscriberVersionNumber: b_Map.get(key_b)
              .SubscriberPackageVersionNumber,
            isSame: false
          };

          if (a_Map.has(key_b)) {
            responseObj.sourceSubscriberVersionId = a_Map.get(
              key_b
            ).SubscriberPackageVersionId;
            responseObj.sourceSubscriberVersionNumber = a_Map.get(
              key_b
            ).SubscriberPackageVersionNumber;
            if (
              responseObj.sourceSubscriberVersionId ==
              responseObj.targetSubscriberVersionId
            ) {
              responseObj.isSame = true;
            }
          }
          responseArrayObject.push(responseObj);
        }
        //Add packages that are present in source but not in target
        for (var key_a of Array.from(a_Map.keys())) {
          if (
            responseArrayObject
              .map(function(item) {
                return item.packageId;
              })
              .indexOf(key_a) == -1
          ) {
            var responseObj: responseClass = {
              packageName: a_Map.get(key_a).SubscriberPackageName,
              packageId: a_Map.get(key_a).SubscriberPackageId,
              sourceSubscriberVersionId: a_Map.get(key_a)
                .SubscriberPackageVersionId,
              targetSubscriberVersionId: "--None--",
              sourceSubscriberVersionNumber: a_Map.get(key_a)
                .SubscriberPackageVersionNumber,
              targetSubscriberVersionNumber: "--None--",
              isSame: false
            };
            responseArrayObject.push(responseObj);
          }
        }

        if (!this.flags.json) {
          this.showOutput(responseArrayObject);
        }
        return responseArrayObject;
      })
      .catch(err => {
        return err;
      });
    return result;
  }
  async showOutput(responseArrayObject: any[]) {
    responseArrayObject = responseArrayObject.map(function(resp_obj) {
      if (resp_obj.isSame) {
        resp_obj.packageName = colors.green(resp_obj.packageName);
        resp_obj.packageId = colors.green(resp_obj.packageId);
        resp_obj.sourceSubscriberVersionId = colors.green(
          resp_obj.sourceSubscriberVersionId
        );
        resp_obj.targetSubscriberVersionId = colors.green(
          resp_obj.targetSubscriberVersionId
        );
        resp_obj.sourceSubscriberVersionNumber = colors.green(
          resp_obj.sourceSubscriberVersionNumber
        );
        resp_obj.targetSubscriberVersionNumber = colors.green(
          resp_obj.targetSubscriberVersionNumber
        );
      } else {
        resp_obj.packageName = colors.red(resp_obj.packageName);
        resp_obj.packageId = colors.red(resp_obj.packageId);
        resp_obj.sourceSubscriberVersionId = colors.red(
          resp_obj.sourceSubscriberVersionId
        );
        resp_obj.targetSubscriberVersionId = colors.red(
          resp_obj.targetSubscriberVersionId
        );
        resp_obj.sourceSubscriberVersionNumber = colors.red(
          resp_obj.sourceSubscriberVersionNumber
        );
        resp_obj.targetSubscriberVersionNumber = colors.red(
          resp_obj.targetSubscriberVersionNumber
        );
      }
      return resp_obj;
    });
    this.ux.table(responseArrayObject, this.tableColumnData);
    return Promise.resolve;
  }
}
