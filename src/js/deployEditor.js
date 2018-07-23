DeployEditor = {

    ////////////////////////////////////////////
    ////            State Variables         ////
    ////////////////////////////////////////////

    web3Provider: null,
    contracts: {},
    account: '0x0',
    isPremium: false,
    initBlock: 0,
    listenPeriod: 30,    // app listens for some events from the last 30 blocks


    ////////////////////////////////////////////
    ////            Init Functions          ////
    ////////////////////////////////////////////


    init: function() {

        return DeployEditor.initWeb3();
    },

    /* initialize Web3 */
    initWeb3: function() {
        
        if(typeof web3 != 'undefined') {
            DeployEditor.web3Provider = web3.currentProvider;
            web3 = new Web3(web3.currentProvider);
        } else {
            DeployEditor.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
            web3 = new Web3(DeployEditor.web3Provider);
        }

        return DeployEditor.initContract();
    },

    /* Upload the contract's abstractions */
    initContract: function() {

        // $.getJSON("Catalog.json", function(catalog) {

        //     // Inistanitiate a new truffle contract from the artifact
        //     DeployEditor.contracts.Catalog = TruffleContract(catalog);
        //     // Connect provider to interact with contract
        //     DeployEditor.contracts.Catalog.setProvider(DeployEditor.web3Provider);

            $.getJSON("PhotoContentManagement.json", function(photoContent) {

                DeployEditor.contracts["PhotoContent"] = TruffleContract(photoContent);
                DeployEditor.contracts["PhotoContent"].setProvider(DeployEditor.web3Provider);

                $.getJSON("VideoContentManagement.json", function(videoContent) {

                    DeployEditor.contracts["VideoContent"] = TruffleContract(videoContent);
                    DeployEditor.contracts["VideoContent"].setProvider(DeployEditor.web3Provider);
                    
                    $.getJSON("SongContentManagement.json", function(songContent) {

                        DeployEditor.contracts["SongContent"] = TruffleContract(songContent);
                        DeployEditor.contracts["SongContent"].setProvider(DeployEditor.web3Provider);            
                    });
                });
            });
//        });
    },

    /* Create the event listeners */
    listenForEvents: function() {

    },

    deployContent: function() {

        const title = $('#publishTitleInput').val();
        const author = $('#publishAuthorInput').val();
        const genre = $('#genreSelect').val();

        console.log(title);
        console.log(author);
        console.log(genre);

        App.contracts.Catalog.deployed().then( async(instance) => {

            const content = await DeployEditor.contracts[genre].new(web3.fromUtf8(author), web3.fromUtf8(title), 10, instance.address);
            console.log(content.address);
    
        }); // 7M
    }
}

// Call init whenever the window loads
$(function() {
    $(window).load(function() {
        DeployEditor.init();
    });
});