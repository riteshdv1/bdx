import { flags, SfdxCommand } from '@salesforce/command';
import child_process = require('child_process');
import util = require('util');
import fs = require('fs');
import rimraf = require("rimraf");
//import colors = require('colors');
//import * as stripcolor from 'strip-color';

const exec = util.promisify(child_process.exec);

export default class KnowledgeArticleTypeAdd extends SfdxCommand {
    public static description = 'Add Article Type';
    protected static requiresUsername = true;

    protected static flagsConfig = {
        name: flags.string({ char: 'n', description: 'name of article type to be added', required: true })
    };

    public async run(): Promise<any> {
        this.ux.startSpinner('starting headless browser');
        var objectName = this.flags.name;
        var folderName = "unpackaged1234567";

        var objectFileStr = '<?xml version="1.0" encoding="UTF-8"?>' +
            '<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">' +
            '<articleTypeChannelDisplay>' +
            '<articleTypeTemplates>' +
            '<channel>App</channel>' +
            '<template>Tab</template>' +
            '</articleTypeTemplates>' +
            '<articleTypeTemplates>' +
            '<channel>Prm</channel>' +
            '<template>Tab</template>' +
            '</articleTypeTemplates>' +
            '<articleTypeTemplates>' +
            '<channel>Csp</channel>' +
            '<template>Tab</template>' +
            '</articleTypeTemplates>' +
            '<articleTypeTemplates>' +
            '<channel>Pkb</channel>' +
            '<template>Toc</template>' +
            '</articleTypeTemplates>' +
            '</articleTypeChannelDisplay>' +
            '<compactLayoutAssignment>SYSTEM</compactLayoutAssignment>' +
            '<deploymentStatus>Deployed</deploymentStatus>' +
            '<enableFeeds>false</enableFeeds>' +
            '<enableHistory>true</enableHistory>' +
            '<label>' + objectName + '</label>' +
            '<pluralLabel>' + objectName + '</pluralLabel>' +
            '</CustomObject>';

        var packageXmlStr = '<?xml version="1.0" encoding="UTF-8"?>' +
            '<Package xmlns="http://soap.sforce.com/2006/04/metadata">' +
            '<types>' +
            '<name>CustomObject</name>' +
            '<members>' + objectName + '__kav</members>' +
            '</types>' +
            '<version>45.0</version>' +
            '</Package>';

        //Create a folder
        fs.mkdir("./" + folderName, function (err) {
            if (err) return false
            else return true
        });

        fs.mkdir("./" + folderName + "/objects", function (err) {
            if (err) return false
            else return true
        });

        fs.writeFile("./" + folderName + "/objects/" + objectName + "__kav.object", objectFileStr, function (err) {
            if (err) return false
            else return true
        });

        fs.writeFile("./" + folderName + "/package.xml", packageXmlStr, function (err) {
            if (err) return false
            else return true
        });

        try {
            await exec(`sfdx force:mdapi:deploy -d ${folderName} -w 10 -u ${this.flags.targetusername} --json`)
            //console.log(colors.green(yourscript.stdout));
            return true;
        } catch (Exception) {
            //return console.log(colors.red(Exception));
            return false;
        } finally {
            rimraf('./' + folderName, (err) => {
                if (err) return false
                else return true
            });
        }
    }
}
