var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "your 12 words from metamask";
var infura_key = "your infura key";
var account_index = 0;    // Index of your Ropsten account on metamask, starting at 0

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // for more about customizing your Truffle configuration!
  networks: {

    // Info for local deployment
    development: {
      host: "127.0.0.1",
      port: 8545,
      gas: 750000000,
      network_id:  "*" // Match any network id
    }, 

    //Info for deployment on Ropsten, exploiting an Infura node
    ropsten:  {
      provider: function() {
        return new HDWalletProvider(mnemonic, "https://ropsten.infura.io/v3/"+infura_key, account_index)
      },
      network_id: 3,
      host: "127.0.0.1",
      port:  8545,
      gas:   4700000,
      gasPrice: 30000000000,
    }
  },

  // Directive for Solidity compiler, add optimization otherwise the Catalog is too big (gas intensive)
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
};
