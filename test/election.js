
var Catalog = artifacts.require("./Catalog.sol");

contract("Catalog", function(accounts) {
    var electionInstance;
    var candidateId;

    it("initializes with 2 candidates",  function() {           // Run a test

        return Catalog.deployed().then(function(instance) {    // Get a reference to a Election.sol deployed contract (the last one)
            console.log(instance);
            return instance.catalog();                  // Call a getter
        }).then(function(addr) {                               // 'count' contains the result of candidates count
            console.log(addr);
        });
    });
})


/*
var Election = artifacts.require("./Election.sol");

contract("Election", function(accounts) {
    var electionInstance;
    var candidateId;

    it("initializes with 2 candidates",  function() {           // Run a test

        return Election.deployed().then(function(instance) {    // Get a reference to a Election.sol deployed contract (the last one)
            return instance.candidatesCount();                  // Call a getter
        }).then(function(count) {                               // 'count' contains the result of candidates count
            assert.equal(count, 2);
        });
    });

    it("initializes the candidates with the correct values", function() {
        return Election.deployed().then(function(instance) {
            electionInstance = instance;
            return electionInstance.candidates(1);
        }).then(function(candidate) {
            assert.equal(candidate[0], 1, "contains the correct id");
            assert.equal(candidate[1], "Candidate 1", "contains the correct name");
            assert.equal(candidate[2], 0, "contains the correct votes count");
            return electionInstance.candidates(2);
        }).then(function(candidate) {
            assert.equal(candidate[0], 2, "contains the correct id");
            assert.equal(candidate[1], "Candidate 2", "contains the correct name");
            assert.equal(candidate[2], 0, "contains the correct votes count");
        });
    });

    it("allows a voter to cast a vote", function() {
        return Election.deployed().then(function(instance) {
            // Get the contract instance
            electionInstance = instance;
            candidateId = 1;
            return electionInstance.vote(candidateId, {from: accounts[0] });
        
        }).then(function(receipt) { // in the receipt is possible to see events
            // Catch event
            assert.equal(receipt.logs.length, 1, "an event was triggered");
            assert.equal(receipt.logs[0].event, "votedEvent", "correct type of event");
            assert.equal(receipt.logs[0].args._candidateId.toNumber(), candidateId, "correct candidate");
            return electionInstance.voters(accounts[0]);
            
        }).then(function(voted) {
            // Get who has voted (voted is the bool from the voter mapping) and checks if the map was set correctly
            assert(voted, "the voter was marked as voted");
            return electionInstance.candidates(candidateId);

        }).then(function(candidate) {
            // Get the candidate struct

            var voteCount = candidate[2];   // Access to a solidity struct: like an array
            assert.equal(voteCount, 1, "increments the candidate's vote count");
        });
    });

    it("throws errors", function() {
        return Election.deployed().then(function(instance) {
            electionInstance = instance;
            return electionInstance.vote(99, {from: accounts[9]});
        }).then(assert.fail).catch(function(error) {
            assert(error.message.indexOf('revert') >= 0, "error message must contain revert"); // Check if the msg has revert inside is message
            return electionInstance.candidates(1);
        }).then(function(candidate1) {
            var voteCount = candidate1[2];
            assert.equal(voteCount, 1, "candidate 1 did not received any votes");
            return electionInstance.candidates(2);
        }).then(function(candidate2){
            var voteCount = candidate2[2];
            assert.equal(voteCount, 0, "candidate received votes");
        });
    });

    it("check for double voting", function() {
        return Election.deployed().then(function(instance) {
            electionInstance = instance;
            candidateId = 2;
            electionInstance.vote(candidateId, {from: accounts[1]});
            return electionInstance.candidates(candidateId);
        }).then(function(candidate) {
            var voteCount = candidate[2];
            assert.equal(voteCount, 1, "ok first vote");
            // try to vote again
            return electionInstance.vote(candidateId, {from: accounts[1]});
        }).then(assert.fail).catch(function(error) {
            assert(error.message.indexOf('revert') >= 0, "error message must contain revert");
            return electionInstance.candidates(1);
        }).then(function(candidate1) {
            var voteCount = candidate1[2];
            assert.equal(voteCount, 1, "candidate 1 did not received any votes");
            return electionInstance.candidates(2);
        }).then(function(candidate2) {
            var voteCount = candidate2[2];
            assert.equal(voteCount, 1, "candidate 1 did not received any votes");
        })
    })

});
*/