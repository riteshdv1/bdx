import { flags, SfdxCommand } from "@salesforce/command";
import child_process = require("child_process");
import * as puppeteer from "puppeteer";
import * as stripcolor from "strip-color";
import util = require("util");

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

    this.ux.startSpinner("starting headless browser");

    const browser = await puppeteer.launch({
      headless: !this.flags.showbrowser,
      args: ["--no-sandbox"]
    });
    // const context = browser.defaultBrowserContext();

    // // get the force-org-open url for your scratch org
    // const openResult = await exec(`sfdx force:org:open -p /${this.flags.name}/communitySetup/cwApp.app#/c/page/settings -r --json`);
    //const openResult = await exec(`sfdx force:org:open -p /lightning/setup/Picklists/home -u ${this.flags.targetusername} -r --json`);
    //const url = JSON.parse(stripcolor(openResult.stdout)).result.url;
    //const iframeTitle = 'Communities ~ Salesforce - Developer Edition';
    //const workspacesLink = `a[title*="Workspaces"][title*="${this.flags.name}"]`;
    // await context.overridePermissions(url, ['notifications']);

    // The type we are querying for
    /*interface QueryResult {
      FullName : string;
      MasterLabel : String;
      Description : string;
      Id : string;
    }*/

    /**
     * Get the Global picklist picklist Id
     */
    // Query the org
    /*
	const query = await exec(`sfdx force:data:soql:query -q "SELECT Id FROM GlobalValueSet where MasterLabel like \'%${this.flags.name}%\'" -t -u ${this.flags.targetusername} --json`);
    const results = JSON.parse(stripcolor(query.stdout)).result;
    var pickListId = null;

    if (results.records.length > 1) {
      throw new Error('There are more than 1 matching records');
    } else if (results.records.length === 0) {
      throw new Error('No records found');
    } else {
      // tslint:disable-next-line:no-any
      this.ux.log(results.records[0].Id);
      pickListId = results.records[0].Id;
    }
    */

    /**
     * Open the picklist setup page
     */

    /**
     * Switch to classic
     */

    // open the org, this way you don't need to login into salesforce
    const openResult = await exec(
      `sfdx force:org:open -p /lightning/setup/SetupOneHome/home?0.source=alohaHeader -u ${
        this.flags.targetusername
      } -r --json`
    );
    const url = JSON.parse(stripcolor(openResult.stdout)).result.url;
    const page = await browser.newPage();

    //Get the instance url
    const userDetails = await exec(
      `sfdx force:user:display -u ${this.flags.targetusername} --json`
    );
    const instanceUrl = JSON.parse(stripcolor(userDetails.stdout)).result
      .instanceUrl;

    //Navigation starts from here

    await page.goto(url, {
      waitUntil: "networkidle2"
    });

    // Switch to Classic as pages renders more quickly than Lightning
    await page.goto(
      instanceUrl +
        "/ltng/switcher?destination=classic&referrer=%2Flightning%2Fpage%2Fhome",
      {
        waitUntil: "networkidle2"
      }
    );

    await page.goto(
      instanceUrl +
        "/setup/ui/picklist_masteredit.jsp?tid=ka%23&pt=60&retURL=%2F_ui%2Fknowledge%2Fadmin%2FValidationStatusFieldsNonUddUi%3FretURL%3D%252Fui%252Fsetup%252FSetup%253Fsetupid%253DKnowledge%26setupid%3DValidationStatuses&p1=" +
        this.flags.name,
      {
        waitUntil: "networkidle2"
      }
    );

    /*
      This step is not required, as assigning picklist values to record types can be done using
      record type's metadata file
      const selectAllRecordType = await page.waitForXPath(`//*[@id="allBox"]`)
      await selectAllRecordType.click();
      */

    /*await Promise.all((await page.waitForXPath(`//*[@id="bottomButtonRow"]/input[1]`)
     .then(await page.waitForXPath(`//*[@id="bottomButtonRow"]/input[1]`).click())

     });*/

    const buttonSave = await page.waitForXPath(
      `//*[@id="bottomButtonRow"]/input[1]`
    );
    await buttonSave.click();

    this.ux.stopSpinner("Value Added");
    //return true;

    this.ux.log("i am here");

    // Go to home page in classic
    await page.goto(instanceUrl + "/home/home.jsp", {
      waitUntil: "networkidle2"
    });

    // Switch back to Lightning as this setting is saved against the user

    await page.waitForSelector(
      "#phHeader > tbody > tr > td.right.vtop > div > div.navLinks > div > a.switch-to-lightning"
    );
    await page.click(
      "#phHeader > tbody > tr > td.right.vtop > div > div.navLinks > div > a.switch-to-lightning"
    );
    await page.waitFor(20000);
    page.waitForNavigation();

    // Close the browser
    // await browser.close();

    /*****
      const buttonCreate = await page.waitForXPath(`//*[@id="bottomButtonRow"]/input[1]`)
      buttonCreate.click();

      const buttonEdit = await page.waitForXPath(`//*[@id="0NtO00000004N9S_PicklistMasterActiveValueRelatedList_body"]/table/tbody/tr[3]/td[1]/a[1]`)
      buttonEdit.click();

      await page.waitForSelector('.detailList > tbody > tr > .data2Col > #p2')
      await page.click('.detailList > tbody > tr > .data2Col > #p2')

      const buttonSave = await page.waitForXPath(`//*[@id="bottomButtonRow"]/input[1]`)
      buttonSave.click()

      // Switch back to Lightning as this setting is saved against the user
      await page.waitForSelector('.right > .multiforce > .navLinks > .linkElements > .switch-to-lightning')
      await page.click('.right > .multiforce > .navLinks > .linkElements > .switch-to-lightning')
    **********/

    //await page.waitForSelector(`input[value="new"]`);
    // await page.click(`input[value="new"]`);
    /*
       // const gvId="//*[@id=\'"+${pickListId}+"_PicklistMasterActiveValueRelatedList\']/div[1]/div/div[1]/table/tbody/tr/td[2]/input[@name='new']";
        //const buttonNew = await page.$x("//*[@id='0NtO00000004N9S_PicklistMasterActiveValueRelatedList']/div[1]/div/div[1]/table/tbody/tr/td[2]/input[@name='new']");
        //const buttonNew = (await page.$x(${gvId}));
        //await page.waitFor(2000);
        try {
          //const buttonNew = await page.waitForSelector('#0NtO00000004N9S_PicklistMasterActiveValueRelatedList > div.listRelatedObject.setupBlock > div > div.pbHeader > table > tbody > tr > td.pbButton > input:nth-child(1)')
          await page.waitFor(2000);
          //const buttonNew = await page.waitForXPath("//*[@id='0NtO00000004N9S_PicklistMasterActiveValueRelatedList']/div[1]/div/div[1]/table/tbody/tr/td[2]/input[1]")
          const buttonNew = await page.$('new');
          if(buttonNew!=null){
            buttonNew.click();
          }
          else{
            throw new Error('New button not found'+buttonNew);
          }
        }
       catch(error){
        this.ux.log(error);
       }
    */

    // await page.click('#bodyCell > div.listRelatedObject.setupBlock > div > div.pbBody > table > tbody > tr.dataRow.even.first > th > a')
    /*
     await page.waitForSelector(`iframe[title="${iframeTitle}"]`);
     // <a href="/servlet/networks/switch?networkId=0DBZ00000004eq5&amp;startURL=%2FcommunitySetup%2FcwApp.app%23%2Fc%2Fhome&amp;" class="networkManageLink zen-mhs actionLink" data-networkid="0DBZ00000004eq5" data-networkurl="/servlet/networks/switch?networkId=0DBZ00000004eq5&amp;startURL=%2FcommunitySetup%2FcwApp.app%23%2Fc%2Fhome" target="_blank" title="Workspaces - Record 2 - dealers">Workspaces</a>
     for (const frame of page.frames()) {
       const title = await frame.title();
       if (title === iframeTitle) {

         await frame.waitForSelector(workspacesLink);

         const [newtab] = await Promise.all([
           new Promise<puppeteer.Page>(resolve => page.once('popup', resolve)),
           frame.click(workspacesLink)
         ]);

         await newtab.waitForSelector('a.js-workspace-administration');
         await newtab.click('a.js-workspace-administration');

         // it's in another stupid iframe!!
         const activateIframeTitle = `Settings ~ ${this.flags.name}`;
         const activateIframeTitleSelector = `iframe[title="${activateIframeTitle}"]`;

         newtab.on('dialog', async dialog => {
           await newtab.waitFor(1500);
           await dialog.accept();
           await newtab.waitFor(1500);
           await browser.close();
           this.ux.stopSpinner('Activated community');
           return true;
         });

         await newtab.waitForSelector(activateIframeTitleSelector);
         for (const innerFrame of newtab.frames()) {
           const innerTitle = await innerFrame.title();
           if (innerTitle === activateIframeTitle) {
             await innerFrame.waitForSelector('input[value="Activate Community"]');
             await innerFrame.click('input[value="Activate Community"]');

           }
         }

         // <a class="js-workspace-administration slds-text-link--reset slds-m-bottom--small slds-text-align--center slds-box--border js-workspace-tile communitySetupCmcWorkspaceTile" href="javascript:void(0);" data-aura-rendered-by="58:119;a" data-aura-class="communitySetupCmcWorkspaceTile"><div class="slds-m-top--large" data-aura-rendered-by="59:119;a"><lightning-icon class="slds-shrink-none administration slds-icon-standard-custom slds-icon_container" data-data-rendering-service-uid="131" data-aura-rendered-by="61:119;a"><lightning-primitive-icon lightning-primitiveicon_primitiveicon-host=""><svg lightning-primitiveIcon_primitiveIcon="" focusable="false" data-key="custom" aria-hidden="true" class="slds-icon slds-icon_large"><use lightning-primitiveIcon_primitiveIcon="" xlink:href="/externalid/_slds/icons/standard-sprite/svg/symbols.svg?cache=9.24.0#custom"></use></svg></lightning-primitive-icon></lightning-icon></div><div class="slds-text-heading--small slds-m-top--small js-tile-label" data-aura-rendered-by="62:119;a"><strong data-aura-rendered-by="63:119;a">Administration</strong></div><div class="slds-text-body--regular slds-text-color--weak slds-m-top--small slds-m-horizontal--small js-tile-description" data-aura-rendered-by="65:119;a">Configure settings and properties for your community.</div></a>
         // // verify that it actually changed value from the click?
         // await frame.waitForSelector('input.enableWaveInCommunities:checked');

         // await frame.waitForSelector('input[title="Save"]');
         // await frame.click('input[title="Save"]');
         // // this.ux.log('clicked save');
         // await frame.waitFor(500);
         // await browser.close();
         // return true;
       }
     }
 */
    // const activateButtonSelector = 'button[data-nextstatus="Live"]';

    // await page.waitForSelector(activateButtonSelector);
    // const activateButton = await page.$(activateButtonSelector);
    // await activateButton.click();

    // await browser.close();
    // this.ux.stopSpinner(`Published community: ${this.flags.name}`);
    // return true;
  }
}
