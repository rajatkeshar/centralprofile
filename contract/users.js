var constants = require('../utils/constants.js');

module.exports = {
  registerUsers: async function(fName, lName, address, secret, phoneNo, email, password, dappName, role, hash, countryCode, abhaId, dappId) {
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
      transactionId: this.trs.id,
      abhaId: (abhaId)? abhaId: null
    });
  },
  confirmPassword: async function(phoneNo, email, password, dappName) {
    console.log("calling contract confirmPassword: ", this);
    app.sdb.lock('users.confirmPassword@' + phoneNo);

    if(phoneNo) {
      app.sdb.update('User', { password: password }, {phoneNo: phoneNo, dappName: dappName});
    }
    if(email) {
      app.sdb.update('User', { password: password }, {email: email, dappName: dappName});
    }
  },
  updateUser: async function(email, dappName, abhaId, abhaNo, abhaCardUrl, adharNo) {
    console.log("calling contract updateUser: ", this);
    app.sdb.lock('users.updateUser@' + email);

    app.sdb.update('User', { abhaId: abhaId || null }, {email: email, dappName: dappName});
    app.sdb.update('User', { abhaNo: abhaNo || null }, {email: email, dappName: dappName});
    app.sdb.update('User', { abhaCardUrl: abhaCardUrl || null }, {email: email, dappName: dappName});
    app.sdb.update('User', { adharNo: adharNo || null }, {email: email, dappName: dappName});
  }
}
