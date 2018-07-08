App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',

  init: function() {
    return App.initWeb3();
  },

  initWeb3: function() {
    if (typeof web3 !== 'undefined') {
      // If a web3 instance is already provided by Meta Mask.
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // Specify default instance if no web3 instance provided
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
      web3 = new Web3(App.web3Provider);
    }
    return App.initContract();
  },

  initContract: function() {
    $.getJSON("Election.json", function(election) {
      // Instantiate a new truffle contract from the artifact
      App.contracts.Election = TruffleContract(election);
      // Connect provider to interact with contract
      App.contracts.Election.setProvider(App.web3Provider);
      App.listenForEvents();

      return App.render();
    });
  },

  listenForEvents: function() {
    App.contracts.Election.deployed().then(function(instance) {
      electionInstance = instance;
      // Restart browser if event not received, known Metamask issue

      // First argument: {} :: Solidity allows to pass filter to events (not used here)
      // Second argument: metadata :: we want to subscribe to events on the entire blockchain
      instance.votedEvent({}, { // Look for voted event
        fromBlock: 0,
        toBlock: 'latest'
      }).watch(function(error, event) { // Subscribe to event
        // Whenever the event is triggered
        console.log("event triggered", event);
        App.render();
      });
    });
  },

  render: function() {
    var electionInstance;
    var loader = $("#loader");
    var content = $("#content");

    loader.show();
    content.hide();

    // Load account data
    web3.eth.getCoinbase(function(err, account) {
      if (err === null) {
        App.account = account;
        $("#accountAddress").html("Your Account: " + account);
      }
    });

    // Load contract data
    App.contracts.Election.deployed().then(function(instance) {
      electionInstance = instance;
      return electionInstance.candidatesCount();
    }).then(function(candidatesCount) {
      var candidatesResults = $("#candidatesResults");
      candidatesResults.empty();

      var candidateSelect = $("#candidatesSelect");
      candidateSelect.empty();

      for (var i = 1; i <= candidatesCount; i++) {
        electionInstance.candidates(i).then(function(candidate) {
          var id = candidate[0];
          var name = candidate[1];
          var voteCount = candidate[2];

          // Render candidate Result
          var candidateTemplate = "<tr><th>" + "id" + 
                                  "</th><td>" + "title" + 
                                  "</td><td>" + "author" +
                                  "</td><td>" + "Genre" +
                                  "</td><td>" + "Votes" + "</td></tr>"
          candidatesResults.append(candidateTemplate);

          // Render candidate option
          var candidteOption = "<option value='" + id + "' >" + name + "</option>";
          candidateSelect.append(candidteOption);
        });
      }
      return electionInstance.voters(App.account);
    }).then(function(hasVoted) {
      if(hasVoted) {
        $('form').hide();
      }
      loader.hide();
      content.show();
    }).catch(function(error) {
      console.warn(error);
    });
  },

  castVote: function() {
    var candidateId = $("#candidatesSelect").val();
    App.contracts.Election.deployed().then(function(instance) {
      return instance.vote(candidateId, {from: App.account});
    }).then(function(result) {
      // Wait for votes to update
      $('#content').hide();
      $('#loader').show();
    }).catch(function(error) {
      console.error(error);
    });
  }
};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
