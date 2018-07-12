App = {

    ////////////////////////////////////////////
    ////            State Variables         ////
    ////////////////////////////////////////////

    web3Provider: null,
    contracts: {},
    account: '0x0',
    isPremium: false,
    premiumCost: 40000000000000000,
    contentCost: 1000000000000000,
    oneEther: 1000000000000000000,
    initBlock: 0,
    listenPeriod: 15,    // app listens for events on the last 5 blocks


    ////////////////////////////////////////////
    ////            Init Functions          ////
    ////////////////////////////////////////////


    init: function() {

        return App.initWeb3();
    },

    /* initialize Web3 */
    initWeb3: function() {
        if(typeof web3 != 'undefined') {
            App.web3Provider = web3.currentProvider;
            web3 = new Web3(web3.currentProvider);
        } else {
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
            web3 = new Web3(App.web3Provider);
        }

        // Load account data
        web3.eth.getCoinbase(function(err, account) {
            if(err == null) {
                App.account = account;
                $("#accountAddress").html("Your Account: " + account);
            }
        });

        return App.initContract();
    },

    /* Upload the contract's abstractions */
    initContract: function() {

      // TODO riscrivere meglio
      $.getJSON("BaseContentManagement.json", function(baseContent) {

            // Inistanitiate a new truffle contract from the artifact
            App.contracts.BaseContent = TruffleContract(baseContent);
            // Connect provider to interact with contract
            App.contracts.BaseContent.setProvider(App.web3Provider);

            // TODO aggiungere le altre 2 astrazioni
            $.getJSON("PhotoContentManagement.json", function(photoContent) {

                App.contracts.PhotoContent = TruffleContract(photoContent);
                App.contracts.PhotoContent.setProvider(App.web3Provider);

                $.getJSON("Catalog.json", function(catalog) {

                    App.contracts.Catalog = TruffleContract(catalog);
                    App.contracts.Catalog.setProvider(App.web3Provider);
    
                    App.listenForEvents();
                    
                    // Load first series of contracts
                    return App.render();
                });
    
            });

        }) 
    },

    /* Create the event listeners */
    listenForEvents: function() {
        App.contracts.Catalog.deployed().then(async(instance) => {

            catalogInstance = instance;
            web3.eth.getBlockNumber(function(error, block){ 

                ////
                // Add listeners
                ////

                const from = block - App.listenPeriod;
                App.initBlock = block;
                
                if(from < 0) from = 0;
                
                // Access
                instance.UserAccess({}, {fromBlock: App.initBlock, toBlock: 'latest'}).watch(function(error, event) { // Event subscription
                    if(event.args._user)
                        alert("Wow, you have now access to " + web3.toUtf8(event.args._content) + "!");
                });

                // Consumption
                instance.UserConsume({}, {fromBlock: from, toBlock: 'latest'}).watch(function(error, event) { // Event subscription

                    if(!error) {

                        const content = web3.toUtf8(event.args._content);
                        const address = event.args._user.toString();
                        addUserNotification(address, "has viewed", content);
                        console.log("Consumption " + address + " " + content);
                    }
                });

                // New Popular/Latest
                // TODO filter authors/genres
                instance.NewPopularByAuthor({}, {fromBlock: from, toBlock: 'latest'}).watch(function(error, event) {

                    if(!error) {

                        appendNotification(web3.toUtf8(event.args._author), "has a new popular content:", web3.toUtf8(event.args._content));
//                        console.log("New popular of " + address + ": " + web3.toUtf8(event.args._author));
                    }
                });


                instance.NewPopularByGenre({}, {fromBlock: from, toBlock: 'latest'}).watch(async(error, event) => {

                    if(!error){

                        appendNotification(web3.toUtf8(event.args._genre), "has a new popular content:", web3.toUtf8(event.args._content));
//                        console.log("New popular of " + web3.toUtf8(event.args.genre) + ": " + content);
                    }
                });
                

                instance.NewLatestByAuthor({}, {fromBlock: from, toBlock: 'latest'}).watch(function(error, event) {

                    if(!error){
                        appendNotification(web3.toUtf8(event.args._author), "published a new content:", web3.toUtf8(event.args._content));
//                        console.log("New latest of " + web3.toUtf8(event.args._author) + ": " + content);
                    }
                });

                instance.NewLatestByGenre({}, {fromBlock: from, toBlock: 'latest'}).watch(function(error, event) {

                    if(!error){
                        appendNotification(web3.toUtf8(event.args._genre), "has a new content:", web3.toUtf8(event.args._content));
//                        console.log("New latest of " + web3.toUtf8(event.args._genre) + ": " + content);
                    }
                });
            });
        })
    },


    ////////////////////////////////////////////
    ////            Render function         ////
    ////////////////////////////////////////////


    render: function() {

        var catalogInstance;
        var loader = $("#loader");
        var loader_p = loader.children();
        var content = $("#contentUI");
        var authorUI = $('#authorUI');

        content.hide();
        authorUI.hide();
        loader.show();
        
        // Load contract Data
        App.contracts.Catalog.deployed().then(async (instance) => {

            catalogInstance = instance;

            if(await catalogInstance.isPremium(App.account)) {
                App.isPremium = true;
                $("#accountAddress").html("Your Account: " + App.account + ": <b>PREMIUM</b>");
                $('#buyPremiumBtn').hide();
            }
            else {
                App.isPremium = false;
                $("#accountAddress").html("Your Account: " + App.account);
                $('#buyPremiumBtn').show();
            }

            return catalogInstance.getContentList();
 
        }).then(async (resultList) =>  {               
            // Show the list of deployed contents

            var contentList = $("#contentList");
            var contentSelect = $("#contentSelect");
            var consumeSelector = $('#contentSelectConsume');

            contentList.empty();
            contentSelect.empty();
            consumeSelector.empty();

            for(var i=0; i < resultList.length; i++) {

                var title =  web3.toUtf8(resultList[i]);
                // Build the table row, with its own click listener
                var contentTemplate ="<tr onclick='App.showPurchasePopup(this.id)' id='"+title+"' style='cursor: pointer' data-toggle='modal' data-target='#buyModal'><th>" + (i+1) + 
                                    "</th><td>" + title + "</td></tr>";
                contentList.append(contentTemplate);

                // Render content option
                var contentOption = '<option value="' + title + '">' + title + '</option>';
                contentSelect.append(contentOption);

                // Update loading
                loader_p.html("Loading... " + Math.ceil(((i+1)*100) / resultList.length) + " %");
            }

            loader.hide();
            content.show();
            authorUI.show();
        });
    },


    ////////////////////////////////////////////
    ////    Get/Consume Content Functions   ////
    ////////////////////////////////////////////


    /**
     * Buy a content, paying for its price
     * @param content: the content to buy
     */
    buy: function(content) {

        console.log("compra compra compra");

        App.contracts.Catalog.deployed().then(async(instance) => {

            contentBytes = web3.fromUtf8(content);
            alert("REMINDER: You are buying the content " + content + " at the cost of " +
                App.contentCost / App.oneEther + " ether. Confirm or reject the transation on metamask.");


            transaction = await instance.getContent(contentBytes ,{from: App.account, value: App.contentCost});
            console.log("Content got");
            
        }).catch(function(error) {
            console.log(error);
            const errorS = "Error while processing, possible reasons:\n"+
                            " - Not enough balance;\n"+
                            " - You have already access to this content;\n"+
                            " - Increase gas limit.";
            alert(errorS);
        });
    },

    /**
     * Get a content for free
     * @param content: the content to get
     */
    buyContentPremium: function(content) {

        App.contracts.Catalog.deployed().then(async(instance) => {

            contentBytes = web3.fromUtf8(content);
            alert("REMINDER: You are buying the content " + content + " FOR FREE thanks to our premium service."
                    + "Confirm or reject the transation on metamask.");


            transaction = await instance.getContentPremium(contentBytes ,{from: App.account});
            console.log("Content got for free");
            
        }).catch(function(error) {
            console.log(error);
            const errorS = "Error while processing, possible reasons:\n"+
                            " - You have already access to this content;\n"+
                            " - Increase gas limit.";
            alert(errorS);
        });
    },

    /**
     * Consume a content
     * @param content: the content to consume
     */
    consume: function(content) {
        
        console.log("consuma consuma consuma");

        App.contracts.Catalog.deployed().then(async (instance) => {
            
            const contentAddress = await instance.contentMap(web3.fromUtf8(content));
            const contentManager = await App.contracts.BaseContent.at(contentAddress);

            contentManager.consumeContent();

        }).catch(function(error) {
            console.log(error);
            const errorS = "Error while processing, possible reasons:\n"+
                            " - Increase gas limit.";
            alert(errorS);
        });
    },


    ////////////////////////////////////////////
    ////            Buy Premium             ////
    ////////////////////////////////////////////


    /**
     * Buy the premium service
     */
    buyPremium: function() {

        App.contracts.Catalog.deployed().then(async (instance) => {

            alert("REMINDER: You are buying a premium subscription at the cost of " +
                App.premiumCost / App.oneEther + " ether. Confirm or reject the transation on metamask.");

            transaction = await instance.buyPremium({from: App.account, value: App.premiumCost});
            console.log("Premium got");

        }).catch(function(error) {
            const errorS = "Error while processing, possible reasons:\n"+
                            " - Not enough balance;\n"+
                            " - Address not valid;\n"+
                            " - Increase gas limit.";
            alert(errorS);
        });
    },


    ////////////////////////////////////////////
    ////            Gift Functions          ////
    ////////////////////////////////////////////


    /**
     * Show gift form
     */
    makeGift: function() {

        $('#contentGiftDiv').show();
    },


    /**
     * Gift a content to someone
     */
    giftContent: function() {

        App.contracts.Catalog.deployed().then(async (instance) => {

            var input = $('#giftAddressInput');
            var selector = $("#contentSelect");

            if(input.val() == "") {
                alert("Empty field");
            }
            else {

                content = web3.fromUtf8(selector.val());
                alert("REMINDER: You are gifting a the content" + selector.val() + " to " + input.val() + " at the cost of " +
                    App.contentCost / App.oneEther + " ether. Confirm or reject the transation on metamask.");
                transaction = await instance.giftContent(content, input.val(), {from: App.account, value: App.contentCost});
                console.log("Content gifted");
                $('#contentGiftDiv').hide();

            }
        }).catch(function(error) {
            console.log(error);
            const errorS = "Error while processing, possible reasons:\n"+
                            " - Not enough balance;\n"+
                            " - Address not valid;\n"+
                            " - The destinatary has already access to this content;\n"+
                            " - Increase gas limit.";
            alert(errorS);
        });
    },


    /**
     * Show the gift premium form 
     */
    giftPremiumForm: function() {

        $("#giftPremiumInput").show();
        $("#giftPremiumBtn").show();
        $("#showPremiumBtn").hide();
    },


    /**
     * Gift a premium subscription
     */
    giftPremium: function() {

        App.contracts.Catalog.deployed().then(async (instance) => {

            var input = $('#giftPremiumInput');

            if(input.val() == "") {
                alert("Empty field");
            }
            else {

                alert("REMINDER: You are gifting a premium subscription to " + input.val() + " at the cost of " +
                     App.premiumCost / App.oneEther + " ether. Confirm or reject the transation on metamask.");

                transaction = await instance.giftPremium(input.val(), {from: App.account, value: App.premiumCost});
                console.log("Premium gifted");

                $("#giftPremiumInput").hide();
                $("#giftPremiumBtn").hide();
                $("#showPremiumBtn").show();
            }
        }).catch(function(error) {
            console.log(error);
            const errorS = "Error while processing, possible reasons:\n"+
                            " - Not enough balance;\n"+
                            " - Increase gas limit.";
            alert(errorS);
        });
    },

    ////////////////////////////////////////////
    ////            Publish Content         ////
    ////////////////////////////////////////////


    /**
     * Show the publish form
     */
    publishForm: function() {

        $('#publishDiv').show();        
    },

    /**
     * Publish a new content
     */
    addContent: function() {

        var title = $('#publishTitleInput').val();
        var author = $('#publishAuthorInput').val();
        var genre = $('#genreSelect').val();

        const infoString = "REMINDER: You are creating a new content. Content info:\n" +
                            "\n - Title: " + title +
                            "\n - Auhtor: " + author +
                            "\n - Genre: " + genre +
                            "\nConfirm or reject the transation on metamask.";

        alert(infoString);

        App.contracts.Catalog.deployed().then(async(instance) => {

            var contentManagerInstance;

            switch (genre) {
                case "photo":
                    contentManagerInstance = await App.contracts.PhotoContent.new(web3.fromUtf8(title),
                                                                                    web3.fromUtf8(author),
                                                                                    instance.address);
                    break;
                    // Aggiungi il resto TODO
            }

        }).catch(function(error) {
            console.log(error);
            const errorS = "Error while processing, possible reasons:\n"+
                            " - One input field not valid;\n"+
                            " - Not enough balance;\n"+
                            " - Increase gas limit.";
            alert(errorS);
        });;

        // TODO Fare in modo che un autore possa linkare il contratto a piacere

    },


    ////////////////////////////////////////////
    ////          Content list info         ////
    ////////////////////////////////////////////


    /**
     * Get inforamtion about a most popular or latest published content 
     */
    filter: function() {

        var input = $('#mostPopular');
        var selector = $('#filterSelect');
        var result = $('#filterResult');

        App.contracts.Catalog.deployed().then(async (instance) => {

            var content;
            result.html("Loading...");

            // Select filter
            switch (selector.val()) {

                case "authorPop":
                    content = web3.toUtf8(await instance.getMostPopularByAuthor(web3.fromUtf8(input.val())));
                    break;
                case "genrePop":                
                    content = web3.toUtf8(await instance.getMostPopularByGenre(web3.fromUtf8(input.val())));
                    break;
                case "authorLate":                
                    content = web3.toUtf8(await instance.getLatestByAuthor(web3.fromUtf8(input.val())));
                    break;
                case "genreLate":                
                    content = web3.toUtf8(await instance.getLatestByGenre(web3.fromUtf8(input.val())));
                    break;
            }

            // Update
            if(content != "")
                result.html(content);
            else
                result.html("Empty result");
        });     
    },


    ////////////////////////////////////////////
    ////         Show Content Popup         ////
    ////////////////////////////////////////////


    /**
     * Show the popup with all the information about a content, and the possibility to buy it
     */
    showPurchasePopup: function(content){

        // Load content's contracts for more info
        const popup = $('#buyModal');
        const popupBody = $(".modal-body");
        const buyBtn = $(".btn-buy");
        const consumeBtn = $(".btn-consume");
        const buyGiftBtn = $(".btn-buygift");

        popupBody.html("Loading data...");

        
        // Add click listeners, and unbind them right after the click (otherwise the listeners add up)        
        if(App.isPremium) {

            buyBtn.click({param: content}, function(event) {
                App.buyContentPremium(event.data.param);
                console.log("Buy " + event.data.param);
                buyBtn.unbind("click");
                consumeBtn.unbind("click");
                buyGiftBtn.unbind("click");

            });
        }
        else {

            buyBtn.click({param: content}, function(event) {
                App.buy(event.data.param);
                console.log("Buy " + event.data.param);
                buyBtn.unbind("click");
                consumeBtn.unbind("click");
                buyGiftBtn.unbind("click");
            });
        }

        consumeBtn.click({param: content}, function(event) {
            
            App.consume(event.data.param);
            console.log("consume " + event.data.param);
            buyBtn.unbind("click");
            consumeBtn.unbind("click");
            buyGiftBtn.unbind("click");

        });

        buyGiftBtn.click({param: content}, function(event) {
            App.giftContent(event.data.param);
            console.log("buy gift  " + event.data.param);
            buyBtn.unbind("click");
            consumeBtn.unbind("click");
            buyGiftBtn.unbind("click");
    });
        

        App.contracts.Catalog.deployed().then(async(instance) => {

            // Load content
            const contentAddress = await instance.contentMap(web3.fromUtf8(content));
            const contentManager = await App.contracts.BaseContent.at(contentAddress);

            const title = web3.toUtf8(await contentManager.title());
            const author = web3.toUtf8(await contentManager.author());
            const genre = web3.toUtf8(await contentManager.getGenre());
            const views = await contentManager.views();
            const access = await contentManager.accessRightMap(App.account);

            const str = "<h3>Content's details:</h3></br>" +
                        "<b>Title:</b>: " + title +
                        "</br><b>Author:</b> " + author + 
                        "</br><b>Genre:</b>: " + genre + 
                        "</br><b>Views:</b>: " + views;

            popupBody.html(str);

            if(access) {
                buyBtn.hide();
                consumeBtn.show();
            }
            else {
                buyBtn.show();
                consumeBtn.hide();
            }
        });
    }
};

// Call init whenever the window loads
$(function() {
    $(window).load(function() {
        App.init();
    });
});

// Helper function
function updateNotification(defaultText, author, content) {
    
    $("#notification").html("<b>" + defaultText +"</b> " + web3.toUtf8(author) + "<b> ::: </b>" + web3.toUtf8(content));
}



function addUserNotification(address, middleText, content) {

    // Whenever the event is triggered
    const l = address.length;
    const stubAddr = address.charAt(0) + address.charAt(1) + address.charAt(2) + address.charAt(3) +
                        "..." + 
                        address.charAt(l-1) + address.charAt(l-2) + address.charAt(l-3) + address.charAt(l-4);

    appendNotification(stubAddr, middleText, content);
}

function appendNotification(from, middleText, content) {

    const s = from + " " + middleText + " " + content;
    var contentTemplate ="<tr><td>" + s + "</td></tr>";
    $('#notificationList').append(contentTemplate);
}