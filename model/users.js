module.exports = {
    name: 'users',
    fields: [
      {
        name: 'fName',
        type: 'String',
        length: 256,
        index: true
      },
      {
        name: 'lName',
        type: 'String',
        length: 256,
        index: true
      },
      {
        name: 'address',
        type: 'String',
        length: 256,
        not_null: true,
        index: true
      },
      {
        name: 'secret',
        type: 'String',
        length: 256
      },
      {
        name: 'email',
        type: 'String',
        index: true,
        length: 256
      },
      {
        name: 'phoneNo',
        type: 'Number',
        index: true
      },
      {
        name: 'password',
        type: 'String',
        length: 2
      },
      {
        name: 'dappName',
        type: 'String',
        length: 256
      },
      {
        name: 'role',
        type: 'String',
        length: 256,
        default: "user",        
        enum: ["merchant","user",'superadmin','miniadmin','clinicmaster','clinicadmin','clinicauthorizer','clinicissuer','patient','issuer','authorizer']
      },
      {
        name: 'status',
        type: 'String',
        length: 256,
        default: "active",
        enum: ["active", "inactive", "deleted"]
      },
      {
        name: 'token',
        type: 'String',
        length: 256
      },
      {
        name: 'hash',
        type: 'String',
        length: 256
      },
      {
        name: 'countryCode',
        type: 'String',
        length: 2
      },
      {
        name: 'timestamp',
        type: 'Number'
      },
      {
        name: 'dappId',
        type: 'String',
        length: 256
      },
      {
        name: 'transactionId',
        type: 'String',
        length: 256
      },
      {
        name: 'abhaId',
        type: 'String',
        length: 25
      },
      {
        name: 'abhaNo',
        type: 'String',
        length: 25
      },
      {
        name: 'abhaCardUrl',
        type: 'String',
        length: 256
      },
      {
        name: 'adharNo',
        type: 'String',
        length: 12
      }
    ]
  }
