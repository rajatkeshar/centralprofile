const _ = require('lodash')
const util = require("../utils/util");
const auth = require("../utils/auth");
const belriumJS = require('belrium-js');
const aesUtil = require("../utils/aesUtil");
const schema = require('../schema/users.js');
const httpCall = require('../utils/httpCall.js');
const bkbsCall = require('../utils/bkbsCall.js');
const constants = require('../utils/constants.js');
const addressHelper = require('../utils/address.js');
const z_schema = require('../utils/zschema-express.js');
const TransactionTypes = require('../utils/transaction-types.js');

let userExists = async function(req, cb){
    let param = { email: req.query.email }
    let response = await bkbsCall.call('GET', '/api/v1/user/exist?email=' + param.email, param);
    return response;
}

let bkbsLogin = async function (req, cb) {
    let ac_params = { email: req.email, password: req.password };
    let response = await bkbsCall.call('POST', `/api/v1/login`, ac_params);// Call: http://54.254.174.74:8080
    return response;
};

app.route.put('/user',  async function (req) {
    let validateSchema = await z_schema.validate(req.query, schema.registerUsers);
    let fName = req.query.fName;
    let lName = req.query.lName;
    let phoneNo = req.query.phoneNo;
    let email = (req.query.email)? req.query.email.toLowerCase(): null;
    let countryCode = req.query.countryCode;
    let dappName = req.query.dappName.toLowerCase();
    let dappId = util.getDappID();
    let groupName = req.query.groupName || "identity";
    let password = req.query.password;
    let role = req.query.role;
    let hash = req.query.hash;
    let encryptedPassword = aesUtil.encrypt(password, constants.cipher.key);
    let abhaId = req.query.abhaId || "";
    let abhaNo = req.query.abhaNo || "";
    let abhaCardUrl = req.query.abhaCardUrl || "";
    let adharNo = req.query.adharNo || "";

    if(!password.match(constants.regex)) return  {customCode: 4001, message: 'password must contain 7 to 20 at least one numeric digit, one uppercase and one lowercase letter'};
    //if(String(phoneNo).length != 10) return {customCode: 4002, message: 'invalid phoneNo'};

    let identityEmailCheck = await app.model.Users.findOne({condition: { email: email, dappName: dappName, _deleted_: '0' }});
    if(identityEmailCheck) return {customCode: 4003, message: "user with the same email already exists"};
    // let identityPhoneNoCheck = await app.model.Users.findOne({condition: { phoneNo: phoneNo, dappName: dappName, _deleted_: '0' }});
    // if(identityPhoneNoCheck) return {customCode: 4009, message: "user with the same phoneNo already exists"};

    let userProfile = await app.model.Users.findOne({condition: { email: email, _deleted_: '0' }});
    //let userProfile = await app.model.Users.findAll({condition: { email: email, _deleted_: '0' }});
    // let existingDappName = userProfile.map( profile => { return profile.dappName});
    // if(_.includes(existingDappName, dappName)) return "User with the same identity already exists"

    // if user already exists on the central profile with some other dappName
    if(userProfile) {
      // trnsaction flow
      var options = {
        type: TransactionTypes.REGISTER_USER,
        fee: String(constants.fees.registerUsers * constants.fixedPoint),
        args: JSON.stringify([fName, lName, userProfile.address, userProfile.secret, phoneNo, email, encryptedPassword, dappName, role, hash, countryCode, abhaId, abhaNo, abhaCardUrl, adharNo])
      };
      let transaction = belriumJS.dapp.createInnerTransaction(options, constants.admin.secret);
      let params = { transaction: transaction };

      console.log("registerUsers data: ", params);
      var res = await httpCall.call('PUT', `/api/dapps/${dappId}/transactions/signed`, params);
      response.transactionId = res.transactionId;
      return response;
    }
    // if user is not exists on central profile and not exists on bkbs then register on bkbs
    var response = await userExists({ query: { email: email } });
    console.log("userExists: ", response);
    if(response.isSuccess == false) {
      console.log("Registering the Recipient on BKVS ", email, password);
      var response = await bkbsLogin({ email: constants.superUser.email, password: constants.superUser.password });
      console.log("response: ", response);
      if(!response.isSuccess) return {customCode: 3001, message: JSON.stringify(response), isSuccess: false}

      var options = { name: fName, lastName: lName, email: email, countryCode: countryCode, groupName: groupName, password: password, type: "user" };

      console.log("calling registration call with parameters: ", options, response.data.token);
      var response = await bkbsCall.call('POST', '/api/v1/merchant/user/register', options, response.data.token);
      console.log("bkbs register user response: ", response)

      if(!response.isSuccess) return {customCode: 3001, message: JSON.stringify(response), isSuccess: false}

      let wallet = response.data;
      let encryptedSecret = aesUtil.encrypt(wallet.passphrase, constants.cipher.key);
      // trnsaction flow
      var options = {
        type: TransactionTypes.REGISTER_USER,
        fee: String(constants.fees.registerUsers * constants.fixedPoint),
        args: JSON.stringify([fName, lName, wallet.walletAddress, encryptedSecret, phoneNo, email, encryptedPassword, dappName, role, hash, countryCode, abhaId, abhaNo, abhaCardUrl, adharNo])
      };
      let transaction = belriumJS.dapp.createInnerTransaction(options, constants.admin.secret);
      let params = { transaction: transaction };

      console.log("registerUsers data: ", params);
      var res = await httpCall.call('PUT', `/api/dapps/${dappId}/transactions/signed`, params);
      response.transactionId = res.transactionId;
      return response;
    } else {
      let jwtToken = auth.generateToken({fName: fName, lName:lName, phoneNo:phoneNo, email: email, encryptedPassword: encryptedPassword, dappName: dappName, role: role, hash: hash, countryCode: countryCode, abhaId, abhaNo, abhaCardUrl, adharNo});
      let response = {};
      response.jwtToken = jwtToken;
      response.message = "awaiting for wallet address"
      return response;
    }
})

app.route.put('/user/update',  async function (req) {
  if(!req.query.email && !req.query.password) return {customCode: 4011, message: "invalid params"};

  let email = (req.query.email)? req.query.email.toLowerCase(): null;
  let dappName = req.query.dappName.toLowerCase();
  let dappId = util.getDappID();

  let condition = {dappName: dappName, email: email };
  let user = await app.model.Users.findOne({ condition: condition });
  if (!user) return {customCode: 4005, message: 'userId does not exists'};
  
  let abhaId = req.query.abhaId || user.abhaId;
  let abhaNo = req.query.abhaNo || user.abhaNo;
  let abhaCardUrl = req.query.abhaCardUrl || user.abhaCardUrl;
  let adharNo = req.query.adharNo || user.adharNo;

  let decryptedPassword = aesUtil.decrypt(user.password, constants.cipher.key);
  if(!_.isEqual(decryptedPassword, req.query.password)) return {customCode: 4007, message: "incorrect password"};

  // trnsaction flow
  let options = {
    type: TransactionTypes.UPDATE_USER,
    fee: String(constants.fees.updateUser * constants.fixedPoint),
    args: JSON.stringify([email, dappName, abhaId, abhaNo, abhaCardUrl, adharNo])
  };

  let transaction = belriumJS.dapp.createInnerTransaction(options, constants.admin.secret);
  let params = { transaction: transaction };

  console.log("updateUser data: ", params);
  let res = await httpCall.call('PUT', `/api/dapps/${dappId}/transactions/signed`, params);
  return res;
});

app.route.put('/user/:token',  async function (req) {
    let data = auth.parseRequestToken(req.params.token);
    if(!data) return {customCode: 4004, message: "token expired"};
    //if(!data.email && !data.encryptedPassword) return {customCode: 4011, message: "invalid token"};

    let identityEmailCheck = await app.model.Users.findOne({condition: { email: data.email, dappName: data.dappName, _deleted_: '0' }});
    if(identityEmailCheck) return {customCode: 4003, message: "user with the same email already exists"};

    data.encryptedSecret = aesUtil.encrypt(req.query.secret, constants.cipher.key);
    data.walletAddress = addressHelper.generateBase58CheckAddress(util.getPublicKey(req.query.secret)) + data.countryCode;
    let dappId = util.getDappID();
    // trnsaction flow
    let options = {
      type: TransactionTypes.REGISTER_USER,
      fee: String(constants.fees.registerUsers * constants.fixedPoint),
      args: JSON.stringify([data.fName, data.lName, data.walletAddress, data.encryptedSecret, data.phoneNo, data.email, data.encryptedPassword, data.dappName, data.role, data.hash, data.countryCode, abhaId, abhaNo, abhaCardUrl, adharNo])
    };

    let transaction = belriumJS.dapp.createInnerTransaction(options, constants.admin.secret);
    let params = { transaction: transaction };

    console.log("registerUsers data: ", params);
    let res = await httpCall.call('PUT', `/api/dapps/${dappId}/transactions/signed`, params);
    return res;
});

app.route.post('/users/login',  async function (req) {
    let userId =  req.query.userId;
    let dappName = req.query.dappName;
    let condition = {dappName: req.query.dappName};
    if(req.query.userId) {
      condition.phoneNo = req.query.userId;
    }
    if(req.query.email) {
      condition.email = req.query.email;
    }
    let user = await app.model.Users.findOne({ condition: condition });
    if (!user) return {customCode: 4005, message: 'userId does not exists'};

    let decryptedPassword = aesUtil.decrypt(user.password, constants.cipher.key);
    if(!_.isEqual(decryptedPassword, req.query.password)) return {customCode: 4007, message: "incorrect password"};

    delete user.password;
    delete user.secret;
    return user;
});

app.route.post('/users/role/:roleType',  async function (req) {
    let offset =  req.query.offset || 0;
    let limit = req.query.limit || 20;
    let dappName = req.query.dappName;

    let users = await new Promise((resolve)=>{
      if(req.params.roleType.toLowerCase() == "alladmin") {
          var sql = `select * from users where role in("superadmin", "miniadmin", "clinicmaster", "clinicadmin", "clinicauthorizer", "clinicissuer") and dappName=\"${dappName}\" and _deleted_ = '0';`;
      } else {
          var sql = `select * from users where role in(\"${req.params.roleType}\") and dappName=\"${dappName}\" and _deleted_ = '0';`;
      }
      return app.sideChainDatabase.all(sql, (err, row)=>{
          if(err) resolve({ message: JSON.stringify(err), result: {} });
          resolve({ result: row });
      });
    });
    console.log("users: ", users);
    users = (users && users.result && users.result.length)? users.result: [];
    users = users.map(user => { return _.omit(user, ["secret", "password", "token"])});

    return {users: users, total: users.length};
});

app.route.post('/users/auth/forgetPassword',  async function (req) {
    let condition = {dappName: req.query.dappName};
    if(req.query.phoneNo) {
      condition.phoneNo = req.query.userId;
    }
    if(req.query.email) {
      condition.email = req.query.email;
    }

    let user = await app.model.Users.exists(condition);
    if(!user) return {customCode: 4005, message: 'user does not exists'};

    let token = auth.generateToken(condition);
    return {token: token};
});

app.route.post('/users/auth/resetPassword',  async function (req) {
    let condition = {dappName: req.query.dappName};
    if(req.query.phoneNo) {
      condition.phoneNo = req.query.userId;
    }
    if(req.query.email) {
      condition.email = req.query.email;
    }

    if(_.isEqual(req.query.oldPassword, req.query.newPassword)) return {customCode: 4007, message: "password can not be same"};

    let user = await app.model.Users.findOne({ condition: condition });
    if (!user) return {customCode: 4005, message: 'userId does not exists'};

    let decryptedPassword = aesUtil.decrypt(user.password, constants.cipher.key);
    if(!_.isEqual(decryptedPassword, req.query.oldPassword)) return {customCode: 4007, message: "incorrect password"};

    condition.password = req.query.newPassword;
    let token = auth.generateToken(condition);
    return {token: token};
});

app.route.put('/users/auth/confirmPassword/:token',  async function (req) {
    let data = auth.parseRequestToken(req.params.token);
    if(!data) return {customCode: 4004, message: "token expired"};

    if(data.userId) {
      var user = await app.model.Users.exists({ phoneNo: data.phoneNo, dappName: data.dappName });
      if(!user) return {customCode: 4005, message: 'userId does not exists'};
    } else if(data.email) {
      var user = await app.model.Users.exists({ email: data.email, dappName: data.dappName });
      if(!user) return {customCode: 4005, message: 'email does not exists'};
    }

    let password = req.query.password || data.password;

    if(!password.match(constants.regex)) return  {customCode: 4001, message: 'Password must contain 7 to 20 at least one numeric digit, one uppercase and one lowercase letter'};

    let encryptedPassword = aesUtil.encrypt(password, constants.cipher.key);
    let options = {
      type: TransactionTypes.CONFIRM_PASSWORD,
      fee: String(constants.fees.updateUser * constants.fixedPoint),
      args: JSON.stringify([data.phoneNo, data.email, encryptedPassword, data.dappName])
    };
    let transaction = belriumJS.dapp.createInnerTransaction(options, constants.admin.secret);
    let dappId = util.getDappID();
    let params = {
        transaction: transaction
    };

    console.log("updateUser data: ", params);
    let res = await httpCall.call('PUT', `/api/dapps/${dappId}/transactions/signed`, params);
    return res;
});

app.route.post('/users/info',  async function (req) {
    console.log(req.query);
    let condition = {dappName: req.query.dappName};
    if(req.query.phoneNo) {
      condition.phoneNo = req.query.phoneNo;
    }
    if(req.query.email) {
      condition.email = req.query.email;
    }
    if(req.query.role) {
      condition.role = req.query.role;
    }
    let user = await app.model.Users.findOne({condition: condition});
    if(!user) return {customCode: 4000, message: 'userId does not exists'};

    return user;
});
