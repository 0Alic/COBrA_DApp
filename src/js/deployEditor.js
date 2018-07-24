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
        
        // POsso rimuovere?
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
    },

    deployContent: function() {

        const title = $('#publishTitleInput').val();
        const author = $('#publishAuthorInput').val();
        const genre = $('#genreSelect').val();

        App.contracts.Catalog.deployed().then( async(instance) => {

            alert("You are deploying a contract with this information:\n" + 
                    "- Author: " + author +
                    "\n- Title: " + title + 
                    "\n- Genre: " + genre +
                    "\n Confirm or reject the transation on metamask.");

            const content = await DeployEditor.contracts[genre].new(web3.fromUtf8(author), web3.fromUtf8(title), 10, instance.address);

            console.log(content.address);
            alert("Contratulations! Your content was succesfully deployed on the blockchain!\n"+
                    "The address is: " + content.address + ".\nUse this address to link your content to the Catalog.");

            $('#contentAddr').html("Insert this address in the Catalog: " + content.address);

        }).catch(function(error) {
            console.log(error);
            const errorS = "Error while processing, possible reasons:\n"+
                            " - Not enough balance;\n"+
                            " - Increase gas limit.";
            alert(errorS);
        });
    }
}

// Call init whenever the window loads
$(function() {
    $(window).load(function() {
        DeployEditor.init();
    });
});