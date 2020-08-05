const constants = require('./utils/constants.js');
const TransactionTypes = require('./utils/transaction-types.js');

module.exports = async function () {
  console.log('init central profile dapp')

  let contractObjects = {
      registerUsers: {
          type: TransactionTypes.REGISTER_USER,
          name: "register users",
          location: 'users.registerUsers'
      },
      confirmPassword: {
          type: TransactionTypes.CONFIRM_PASSWORD,
          name: "confirm password",
          location: 'users.confirmPassword'
      },
  }
  console.log("app: ", app.contract);
  for(i in contractObjects){
      app.registerContract(contractObjects[i].type, contractObjects[i].location);
  }
  app.setDefaultFee(constants.fees.defaultFee, constants.defaultCurrency);

  app.events.on('newBlock', (block) => {
    console.log('new block received', block.height)
  })
}
