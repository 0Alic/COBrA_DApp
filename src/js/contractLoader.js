Res = {

    contracts: {},
    web3Provider: null,             // Web3 provider
    url: 'http://localhost:8545',   // Url for web3

    init: function() {

        return Res.initWeb3();
    },

    /* initialize Web3 */
    initWeb3: function() {
        
        
        if(typeof web3 != 'undefined') {
//            Res.web3Provider = web3.currentProvider;
//            web3 = new Web3(web3.currentProvider);
            Res.web3Provider = window.ethereum; // !! new standard for modern eth browsers (2/11/18)
            web3 = new Web3(Res.web3Provider);
            try {
                    ethereum.enable().then(async() => {
                        console.log("Privacy ok");
                    });
            }
            catch(error) {
                console.log("New privacy feature testing, error");
                console.log(error);
            }
        } else {
            Res.web3Provider = new Web3.providers.HttpProvider(Res.url); // <==
            web3 = new Web3(Res.web3Provider);
        }

        return Res.initContract();
    },

    /* Upload the contract's abstractions */
    initContract: function() {

        // Load content's abstractions
        $.getJSON("PhotoContentManagement.json", function(photoContent) {

            Res.contracts["PhotoContent"] = TruffleContract(photoContent);
            Res.contracts["PhotoContent"].setProvider(Res.web3Provider);

            $.getJSON("VideoContentManagement.json", function(videoContent) {

                Res.contracts["VideoContent"] = TruffleContract(videoContent);
                Res.contracts["VideoContent"].setProvider(Res.web3Provider);
                
                $.getJSON("SongContentManagement.json", function(songContent) {

                    Res.contracts["SongContent"] = TruffleContract(songContent);
                    Res.contracts["SongContent"].setProvider(Res.web3Provider);

                    $.getJSON("BaseContentManagement.json", function(base) {

                        Res.contracts.BaseContent = TruffleContract(base);
                        Res.contracts.BaseContent.setProvider(Res.web3Provider);

                        // Load Catalog
                        $.getJSON("Catalog.json", function(catalog) {

                            Res.contracts.Catalog = TruffleContract(catalog);
                            Res.contracts.Catalog.setProvider(Res.web3Provider);

                            /* A simple call to the Catalog to check whether it's shut down or not */
                            Res.contracts.Catalog.deployed().then(function(instance) {

                                instance.COBrA_CEO_Address().then(function(addr) {
                                    // Enter here only if the Catalog is still alive
                                    App.listenForEvents();
                                    App.render();

                                }).catch(function(error) {

                                    console.log(error);
                                    $('#cobraTitle').html("COBrA is closed :(");
                                    $('#customerDiv').hide();
                                    $('#authorDiv').hide();
                                    $('.col-lg-3').hide();
                                    $('#catalogBtn').hide();
                                    $('#editorBtn').hide();
                                });
                            });
                        });
                    });
                });
            });
        });
    }
}

// Call init whenever the window loads
$(function() {
    $(window).load(function() {
        Res.init();
    });
});