const util = require("../utils/util");
const belriumJS = require('belrium-js');
const aesUtil = require("../utils/aesUtil");
const httpCall = require('../utils/httpCall');
const schema = require('../schema/register.js');
const bkbsCall = require('../utils/bkbsCall.js');
const constants = require('../utils/constants.js');
const addressHelper = require('../utils/address.js');
const z_schema = require('../utils/zschema-express.js');
const TransactionTypes = require('../utils/transaction-types.js');

function sleep(ms){
    return new Promise(resolve=>{ setTimeout(resolve,ms) })
}

let bkbsLogin = async function (req, cb) {
    let ac_params = { email: req.email, password: req.password };
    let response = await bkbsCall.call('POST', `/api/v1/login`, ac_params);// Call: http://54.254.174.74:8080
    return response;
};

let registerDapp = async function (query) {
    console.log("******** Entering dapp registration ********");
    let dapp_params = {
        secret: query.secret,
        category: 1,
        name:query.dappName,
        description: query.description,
        type: 0,
        link: query.link,
        icon: "http://o7dyh3w0x.bkt.clouddn.com/hello.png",
        delegates: [ "db18d5799944030f76b6ce0879b1ca4b0c2c1cee51f53ce9b43f78259950c2fd", "590e28d2964b0aa4d7c7b98faee4676d467606c6761f7f41f99c52bb4813b5e4", "bfe511158d674c3a1e21111223a49770bee93611d998e88a5d2ea3145de2b68b", "7bbf62931cf3c596591a580212631aff51d6bc0577c54769953caadb23f6ab00", "452df9213aedb3b9fed6db3e2ea9f49d3db226e2dac01828bc3dcd73b7a953b4" ],
        unlockDelegates: 3,
        countryCode: query.countryCode
    };
    let response = await httpCall.call('PUT', `/api/dapps`, dapp_params);
    if(!response.success) return response;

    let encryptedPassword = aesUtil.encrypt(query.password, constants.cipher.key);
    let encryptedSecret = aesUtil.encrypt(query.secret, constants.cipher.key);
    query.walletAddress = addressHelper.generateBase58CheckAddress(util.getPublicKey(query.secret)) + query.countryCode;
    // trnsaction flow
    var options = {
      type: TransactionTypes.REGISTER_USER,
      fee: String(constants.fees.registerUsers * constants.fixedPoint),
      args: JSON.stringify([query.fName, query.lName, query.walletAddress, encryptedSecret, query.phoneNo, query.email.toLowerCase(), encryptedPassword, query.dappName, "superadmin", query.hash, query.countryCode, response.transaction.id])
    };
    let transaction = belriumJS.dapp.createInnerTransaction(options, query.secret);
    let params = { transaction: transaction };
    let dappId = util.getDappID();

    console.log("registerUsers data: ", params);
    await httpCall.call('PUT', `/api/dapps/${dappId}/transactions/signed`, params);
    return response;
}

let installDapp = async function (query) {
    console.log("******* Entering dapp install ********");
    return await httpCall.call('POST', `/api/dapps/install`, {id: query.id, master: "ytfACAMegjrK"});
}

let launchDapp = async function (query) {
    console.log("******* Entering dapp launch ********");
    return await httpCall.call('POST', `/api/dapps/launch`, {id: query.id, master: "ytfACAMegjrK"});
}

app.route.post('/registerDApp', registerDapp);
app.route.post('/installDApp', installDapp);
app.route.post('/launchDApp', launchDapp);

app.route.post('/makeDapp', async function(req){
    let validateSchema = await z_schema.validate(req.query, schema.register);

    var response = await bkbsLogin({ email: req.query.email, password: req.query.password });
    console.log("bkbs login: ", response);
    if(!response.isSuccess) return response;
    let registerRes = await registerDapp(req.query);
    console.log("Dapp register result: " + JSON.stringify(registerRes));

    if(!registerRes.success) return registerRes;
    console.log("Dapp successfully registered");
    var count = 0;
    do{
        await sleep(2000);
        console.log("Install Attempt: ", ++count);
        var dappInstallResult = await installDapp({ id: registerRes.transaction.id });
        console.log("Installation Result: " + JSON.stringify(dappInstallResult));
        if(!dappInstallResult) return { message: "Please try installing DApp again", dappid: registerRes.transaction.id, failedAt: "install" };
        if(count > 15) return { message: "Failed at Installation: " + JSON.stringify(dappInstallResult), dappid: registerRes.transaction.id };
    } while(!dappInstallResult.success);

    console.log("About to launch dapp");
    count = 0;
    do{
        await sleep(2000);
        console.log("Launch Attempt: ", ++count);
        var dappLaunchResult = await launchDapp({ id: registerRes.transaction.id });
        if(!dappLaunchResult) return { message: "Please try launching DApp again", dappid: installreq.query.id, failedAt: "launch" };
        if(count > 15) return { message: "Failed at Launch: " + JSON.stringify(dappInstallResult), dappid: installreq.query.id };
    } while(!dappLaunchResult.success);

    console.log("Finished Dapp launch");
    return { message: "Successfully Installed", dappid: registerRes.transaction.id };
});
