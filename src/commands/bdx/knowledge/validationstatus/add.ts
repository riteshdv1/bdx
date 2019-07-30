import { flags, SfdxCommand } from "@salesforce/command";
import child_process = require("child_process");
import * as puppeteer from "puppeteer";
import * as stripcolor from "strip-color";
import util = require("util");
import colors = require("colors");

const exec = util.promisify(child_process.exec);

export default class KnowledgeValidationStatusAdd extends SfdxCommand {
  public static description = "Add a global picklist value";

  protected static requiresUsername = true;

  protected static flagsConfig = {
    name: flags.string({
      char: "n",
      description: "name of the Global Picklist",
      required: true
    }),
    showbrowser: flags.boolean({
      char: "b",
      description: "show the browser...useful for local debugging"
    })
  };

  // Comment this out if your command does not require an org username
  //protected static requiresUsername = true;

  public async run(): Promise<any> {
    // tslint:disable-line:no-any

    this.ux.startSpinner("Setting up picklist value");

    const browser = await puppeteer.launch({
      headless: !this.flags.showbrowser,
      args: ["--no-sandbox"]
    });
 
    const[url,instanceUrl] = await Promise.all([this.getPicklistUrl(this.flags.targetusername),this.getInstanceUrl(this.flags.targetusername)])

    //Navigation starts from here

    const page = await browser.newPage();
    await page.goto(url, {
      waitUntil: "networkidle2"
    });
        
    const iframeTitle = 'Picklist Value Sets ~ Salesforce - Enterprise Edition';
    const innerIframeTitle='Global Value Set ~ Salesforce - Enterprise Edition'
    const addIframeTitle='Add Picklist Values: Currency Code ~ Salesforce - Enterprise Edition'
    await page.waitForSelector(`iframe[title="${iframeTitle}"]`)
    
    /*
    var firstFrame=page.frames().filter(function(frame){
        const title = await frame.title()
        return title===iframeTitle
    })
    */

    /*
    await firstFrame.waitForSelector('body > div.listRelatedObject.setupBlock > div > div.pbBody > table > tbody > tr:nth-child(3) > th > a');
    await firstFrame.click('body > div.listRelatedObject.setupBlock > div > div.pbBody > table > tbody > tr:nth-child(3) > th > a')

    await page.waitForNavigation({waitUntil: "networkidle2"})
    await page.waitForSelector(`iframe[title="${innerIframeTitle}"]`)

    var secondFrame=page.frames().filter((frame)=>{
      const title = await frame.title()
      return title === iframeTitle
    })

    await secondFrame.waitForSelector('input[name="new"]')
    await secondFrame.click('input[name="new"]')

    await page.waitForNavigation({waitUntil: "networkidle2"})
    await page.waitForSelector(`iframe[title="${addIframeTitle}"]`)

    var thirdFrame=page.frames().filter((frame)=>{
      const title = await frame.title()
      return title === iframeTitle
    })

    await thirdFrame.waitForSelector('textarea[id="p1"]')
    await thirdFrame.type('textarea[id="p1"]','BUD')

    await thirdFrame.waitForSelector('input[id="p18"]')
    await thirdFrame.click('input[id="p18"]')

    await thirdFrame.waitForSelector('input[title="Save"]');
    await thirdFrame.click('input[title="Save"]');
    
    /*
    for (const frame of page.frames()) {
      const title = await frame.title();

      if (title === iframeTitle) {
        
        await frame.waitForSelector('body > div.listRelatedObject.setupBlock > div > div.pbBody > table > tbody > tr:nth-child(3) > th > a');
        await frame.click('body > div.listRelatedObject.setupBlock > div > div.pbBody > table > tbody > tr:nth-child(3) > th > a');

        await page.waitForNavigation({waitUntil: "networkidle2"})
        await page.waitForSelector(`iframe[title="${innerIframeTitle}"]`)

        
        for(const innerFrame of page.frames()){
           const innerTitle=await innerFrame.title()
           if (innerTitle === innerIframeTitle) {
              await innerFrame.waitForSelector('input[name="new"]')
              await innerFrame.click('input[name="new"]')

              await page.waitForNavigation({waitUntil: "networkidle2"})
              await page.waitForSelector(`iframe[title="${addIframeTitle}"]`);

              for(const addFrame of page.frames()){
                const addTitle = await addFrame.title()
                if (addTitle === addIframeTitle) {

                    await frame.waitForSelector('textarea[id="p1"]')
                    await frame.type('textarea[id="p1"]','BUD')

                    await frame.waitForSelector('input[id="p18"]')
                    await frame.click('input[id="p18"]')

                    await frame.waitForSelector('input[title="Save"]');
                    await frame.click('input[title="Save"]');
                }
              }
           }
        }        

       /* await page.waitForNavigation({waitUntil: "networkidle2"})
        await page.waitForSelector(`iframe[title="${addIframeTitle}"]`);

        const textVal=frame.waitForSelector('textarea[id="p1"]')
        textVal.type('AUD')
        const defaultCheckbox=frame.waitForSelector('input[id="p18"]')
        defaultCheckbox.click()

        await frame.waitForSelector('input[title="Save"]');
        await frame.click('input[title="Save"]');
        */

        // verify that it actually changed value from the click?
       /* await frame.waitForSelector('input.enableWaveInCommunities:checked');

        await frame.waitForSelector('input[title="Save"]');
        await frame.click('input[title="Save"]');
        // this.ux.log('clicked save');
        await frame.waitFor(500);
        await browser.close();
        // this.ux.stopSpinner('Activated analytics for communities');*/
      /*}
    }*/
  }
  async getPicklistUrl(targetusername){
    // open the org, this way you don't need to login into salesforce
    const openResult = await exec( `sfdx force:org:open -p /lightning/setup/Picklists/home -u ${targetusername} -r --json`);
    const url = JSON.parse(openResult.stdout).result.url;
    return url;
  }
  async getInstanceUrl(targetusername){
    //Get the instance url
    const userDetails = await exec(`sfdx force:user:display -u ${targetusername} --json` );
    const instanceUrl = JSON.parse(userDetails.stdout).result.instanceUrl;
    return instanceUrl
  }
}
