var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "from metamask";
var infura_key = "from infura";

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // for more about customizing your Truffle configuration!
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      gas: 750000000,
      network_id:  "*" // Match any network id
    }, 
    ropsten:  {
      provider: function() {
        return new HDWalletProvider(mnemonic, "https://ropsten.infura.io/v3/"+infura_key, 1)
      },
      network_id: 3,
      host: "127.0.0.1",
      port:  8545,
      gas:   4700000,
      gasPrice: 1000000000,
    }
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
};
