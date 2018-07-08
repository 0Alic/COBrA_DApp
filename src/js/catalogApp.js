App = {
    web3Provider: null,
    contracts: {},
    account: '0x0',
    premiumCost: 40000000000000000,
    contentCost: 1000000000000000,
    oneEther: 1000000000000000000,
    lastBlock: 0,
    listenPeriod: 5,    // app listens for events on the last 5 blocks

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
                if(from < 0) from = 0;

                // Access
                instance.UserAccess({}, {fromBlock: from, toBlock: 'latest'}).watch(function(error, event) { // Event subscription
                    // Whenever the event is triggered
                    console.log("Access to " + event.args._user + " " + web3.toUtf8(event.args._content));
                });

                // Consumption
                instance.UserConsume({}, {fromBlock: from, toBlock: 'latest'}).watch(function(error, event) { // Event subscription
                    // Whenever the event is triggered
                    console.log("Consumption " + event.args._user + " " + web3.toUtf8(event.args._content));
                });

                // New Popular/Latest
                // TODO filter authors/genres
                instance.NewPopularByAuthor().watch(function(error, event) {

                    if(!error)
                        updateNotification("The best of ", event.args._author, event.args._content);
                });


                instance.NewPopularByGenre().watch(async(error, event) => {

                    if(!error)
                        updateNotification("Top of the", event.args._genre, event.args._content);
                });
                

                instance.NewLatestByAuthor().watch(function(error, event) {

                    if(!error)
                        updateNotification("Check the last entry of ", event.args._author, event.args._content);
                });

                instance.NewLatestByGenre().watch(function(error, event) {

                    if(!error)
                        updateNotification("Don't miss this ", event.args._author, event.args._content);
                });
            });
        })
    },

    loadContracts: function() {

    },

    /* Render the UI */
    render: function() {

        var catalogInstance;
        var loader = $("#loader");
        var loader_p = loader.children();
        var content = $("#contentUI");
        var authorUI = $('#authorUI');

        content.hide();
        authorUI.hide();
        loader.show();
        
        // Load account data
        web3.eth.getCoinbase(function(err, account) {
            if(err == null) {
                App.account = account;
                $("#accountAddress").html("Your Account: " + account);
            }
        });

        // Load contract Data
        App.contracts.Catalog.deployed().then(async (instance) => {
            catalogInstance = instance;

            if(await catalogInstance.isPremium(App.account)) {
                $("#accountAddress").html("Your Account: " + App.account + ": <b>PREMIUM</b>");
                $('#premiumBtn').show();
                $('#premiumForm').hide();
            }
            else {
                $("#accountAddress").html("Your Account: " + App.account);
                $('#premiumBtn').hide();
                $('#premiumForm').show();
            }

            return catalogInstance.getContentList();
 
        }).then(async (resultList) =>  {               
            
            var contentList = $("#contentList");
            var contentSelect = $("#contentSelect");
            var consumeSelector = $('#contentSelectConsume');

            contentList.empty();
            contentSelect.empty();
            consumeSelector.empty();

            // It may take a while, depending on the number of contents
            for(var i=0; i < resultList.length; i++) {

                /*
                contentAddress = await catalogInstance.contentMap(resultList[i]);
                contentManager = await App.contracts.BaseContent.at(contentAddress);
                
                ////
                // Display the content List
                ////                
                title = web3.toUtf8(await contentManager.title());
                author = web3.toUtf8(await contentManager.author());
                genre = web3.toUtf8(await contentManager.getGenre());
                views = await contentManager.views();
                access = await contentManager.accessRightMap(App.account);

                // Render content result
                var contentTemplate = "<tr><th>" + (i+1) + 
                                        "</th><td>" + title + 
                                        "</td><td>" + author +
                                        "</td><td>" + genre +
                                        "</td><td>" + views +
                                        "</td><td>" + "0.001 ether" +
                                        "</td><td>" + "Vores" +
                                        "</td><td>" + access + "</td></tr>"
                */

                var title =  web3.toUtf8(resultList[i]);

               var contentTemplate ="<tr onclick='App.showPurchasePopup(this.id)' id='"+title+"' style='cursor: pointer' data-toggle='modal' data-target='#myModal'><th>" + (i+1) + 
                                    "</th><td>" + title + "</td></tr>";
                contentList.append(contentTemplate);

                // Render content option
                var contentOption = '<option value="' + title + '">' + title + '</option>';
                contentSelect.append(contentOption);

                ////
                // Display contents consumable
                ////
                /*
                const hasAccess = await contentManager.accessRightMap(App.account);
                if(hasAccess) {
                    var contentOption = "<option value='" + contentAddress + "' >" + title + "</option>";
                    consumeSelector.append(contentOption);    
                }
                */
                // Update loading
                loader_p.html("Loading... " + Math.ceil(((i+1)*100) / resultList.length) + " %");
            }

            loader.hide();
            content.show();
            authorUI.show();
        });
    },

    buy: function(content) {

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

        // App.init();
    },

    /* Buy a content
    buy: function() {

        // TODO save the contents I have got in local storage
        var selector = $("#contentSelect");

        App.contracts.Catalog.deployed().then(async(instance) => {

            contentBytes = web3.fromUtf8(selector.val());
            alert("REMINDER: You are buying the content " + selector.val() + " at the cost of " +
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

        App.init();
    },
     */

    /* Get a content for free as premium */
    buyContentPremium() {

        var selector = $("#contentSelect");

        App.contracts.Catalog.deployed().then(async (instance) => {

            content = web3.fromUtf8(selector.val());
            alert("REMINDER: You are getting the content " + selector.val() + " for free thanks to our " +
                "premium service. Confirm or reject the transation on metamask.");

            transaction = await instance.getContentPremium(content ,{from: App.account});
            console.log("Got content for free");

            App.init();
        }).catch(function(error) {
            console.log(error);
            const errorS = "Error while processing, possible reasons:\n"+
                            " - Not enough balance;\n"+
                            " - Increase gas limit.";
            alert(errorS);
        });      
    },
    
    /* Consume a content 
    consume: function() {

        var selector = $('#contentSelectConsume');
        var contentAddress = selector.val();

        App.contracts.BaseContent.at(contentAddress).then(async (instance) => {

            transaction = await instance.consumeContent();

            App.init();

        }).catch(function(error) {
            console.log(error);
            const errorS = "Error while processing, possible reasons:\n"+
                            " - Increase gas limit.";
            alert(errorS);
        });
    },*/

    consume: function(content) {
        
        App.contracts.Catalog.deployed().then(async (instance) => {
            
            const contentAddress = await instance.contentMap(web3.fromUtf8(content));
            const contentManager = await App.contracts.BaseContent.at(contentAddress);

            contentManager.consumeContent();
//            App.init();

        }).catch(function(error) {
            console.log(error);
            const errorS = "Error while processing, possible reasons:\n"+
                            " - Increase gas limit.";
            alert(errorS);
        });
    },

    /* Buy a premium service */
    buyPremium: function() {

        App.contracts.Catalog.deployed().then(async (instance) => {

            alert("REMINDER: You are buying a premium subscription at the cost of " +
                App.premiumCost / App.oneEther + " ether. Confirm or reject the transation on metamask.");

            transaction = await instance.buyPremium({from: App.account, value: App.premiumCost});
            console.log("Premium got");

            App.init();
        }).catch(function(error) {
            const errorS = "Error while processing, possible reasons:\n"+
                            " - Not enough balance;\n"+
                            " - Address not valid;\n"+
                            " - Increase gas limit.";
            alert(errorS);
        });
    },

    /* Show the gift form */
    makeGift: function() {

        $('#contentGiftDiv').show();
    },

    /* Make a gift */
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

                App.init();
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

    /* Gift a premium subscription */
    giftPremium: function() {

        App.contracts.Catalog.deployed().then(async (instance) => {

            var input = $('#giftAddressInput');

            if(input.val() == "") {
                alert("Empty field");
            }
            else {

                alert("REMINDER: You are gifting a premium subscription to " + input.val() + " at the cost of " +
                     App.premiumCost / App.oneEther + " ether. Confirm or reject the transation on metamask.");
                transaction = await instance.giftPremium(input.val(), {from: App.account, value: App.premiumCost});
                console.log("Premium gifted");
                $('#contentGiftDiv').hide();

                App.init();
            }
        }).catch(function(error) {
            console.log(error);
            const errorS = "Error while processing, possible reasons:\n"+
                            " - Not enough balance;\n"+
                            " - Increase gas limit.";
            alert(errorS);
        });
    },

    /* Show the publish form */
    publishForm: function() {

        $('#publishDiv').show();        
    },

    /* Publish a new content */
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

    /* Get inforamtion about a most popular or latest published content */
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

    showPurchasePopup: function(content){

        // Load content's contracts for more info
        const popup = $('#myModal');
        const popupBody = $(".modal-body");
        const buyBtn = $(".btn-buy");
        const consumeBtn = $(".btn-consume");
        const buyGiftBtn = $(".btn-buygift");

        popupBody.html("Loading data...");

        buyBtn.click({param: content}, function(event) {
            App.buy(event.data.param);
            console.log("Buy " + event.data.param);
            buyBtn.unbind("click");
        });

        consumeBtn.click({param: content}, function(event) {
            
            App.consume(event.data.param);
            console.log("consume " + event.data.param);
            consumeBtn.unbind("click");

        });

        buyGiftBtn.click({param: content}, function(event) {
            App.giftContent(event.data.param);
            console.log("buy gift  " + event.data.param);
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

function updateNotification(defaultText, author, content) {
    
    $("#notification").html("<b>" + defaultText +"</b> " + web3.toUtf8(author) + "<b> ::: </b>" + web3.toUtf8(content));
}
