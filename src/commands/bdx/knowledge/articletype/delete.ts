import { flags, SfdxCommand } from '@salesforce/command';
import child_process = require('child_process');
import util = require('util');
import fs = require('fs');
import rimraf = require("rimraf");
import colors = require('colors');
//import * as stripcolor from 'strip-color';

const exec = util.promisify(child_process.exec);

export default class KnowledgeArticleTypeDelete extends SfdxCommand {
    public static description = 'Delete article type';
    protected static requiresUsername = true;

    protected static flagsConfig = {
        name: flags.string({ char: 'n', description: 'name of article type to be deleted', required: true })
    };

    public async run(): Promise<any> {
        this.ux.startSpinner('starting headless browser');
        var objectName = this.flags.name;
        var folderName = "unpackaged1234567";

        var packageXmlStr = '<?xml version="1.0" encoding="UTF-8"?>' +
            '<Package xmlns="http://soap.sforce.com/2006/04/metadata">' +
            '<version>45.0</version>' +
            '</Package>';

        var destructXmlStr = '<?xml version="1.0" encoding="UTF-8"?>' +
            '<Package xmlns="http://soap.sforce.com/2006/04/metadata">' +
            '<types>' +
            '<members>' + objectName + '__kav</members>' +
            '<name>CustomObject</name>' +
            '</types>' +
            '</Package>';

        //Check if the object already exists
        /* var validationResult = await exec(`sfdx force:schema:sobject:describe -s ${objectName}__kav -u ${this.flags.targetusername} --json`)
         const validationStatus = JSON.parse(stripcolor(validationResult.stdout)).status;
         if (validationStatus == 1) { //Status '0' means object exists
             return "The article type doesn't exist"
         }*/

        try {
            await exec(`sfdx force:schema:sobject:describe -s ${objectName}__kav -u ${this.flags.targetusername} --json`)
        } catch (Exception) {
            console.log(colors.red("Article type doesn't exist"));
            return;
        }

        //create a folder
        fs.mkdir("./" + folderName, function (err) {
            if (err) console.error(err)
            else console.log('Successfully create knowledge Folder'.yellow)
        });

        fs.writeFile("./" + folderName + "/destructiveChanges.xml", destructXmlStr, function (err) {
            if (err) {
                console.log(err);
            } else {
                console.log("The file was saved!".yellow);
            }
        });

        fs.writeFile("./" + folderName + "/package.xml", packageXmlStr, function (err) {
            if (err) {
                console.log(err);
            } else {
                console.log("The file was saved!".yellow);
            }
        });

        try {
            var yourscript = await exec(`sfdx force:mdapi:deploy -d ${folderName} -w 10 -u ${this.flags.targetusername} --json`)
            console.log(colors.green(yourscript.stdout));
        } catch (Exception) {
            return console.log(colors.red(Exception));
        } finally {
            rimraf('./' + folderName, (err) => {
                if (err) throw err;
                console.log(colors.green("success"));
            });
        }
    }
}
