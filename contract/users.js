var constants = require('../utils/constants.js');

module.exports = {
  registerUsers: async function(fName, lName, address, secret, phoneNo, email, password, dappName, role, hash, countryCode, dappId) {
    console.log("calling contract registerUsers: ", this);
    app.sdb.lock('users.registerUsers@' + email);
    // let exists = await app.model.Users.exists({email: email, phoneNo: phoneNo});
    // console.log("exists: ", exists);
    // if (exists) return 'user already registered';
    app.sdb.create('User', {
      fName: fName,
      lName: lName,
      address: address,
      secret: secret,
      phoneNo: phoneNo,
      email: email,
      password: password,
      dappName: dappName,
      role: role,
      status: (secret)? "active": "inactive",
      hash: hash || null,
      countryCode: countryCode,
      timestamp: this.trs.timestamp,
      dappId: (dappId)? dappId: null,
      transactionId: this.trs.id
    });
  },
  confirmPassword: async function(phoneNo, password, dappName) {
    console.log("calling contract confirmPassword: ", this);
    app.sdb.lock('users.confirmPassword@' + phoneNo);
    let exists = await app.model.Users.exists({phoneNo: phoneNo});
    console.log("exists: ", exists);
    if (!exists) return 'invalid user';
    app.sdb.update('User', { password: password }, {phoneNo: phoneNo, dappName: dappName});
  }
}
