App = {

    ////////////////////////////////////////////
    ////            State Variables         ////
    ////////////////////////////////////////////

    web3Provider: null,
    contracts: {},
    account: '0x0',
    isPremium: false,
    categoryIds: {"quality": 0, "priceFairness": 1, "rewatchable": 2, "familyFriendly": 3, "average": 4},
    categories: {0: "Quality",1: "PriceFairness",2: "Rewatchable",3: "FamilyFriendly", 4: "Average"},
    initBlock: 0,
    listenPeriod: 30,    // app listens for some events from the last 30 blocks
    preferences: [],


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

            // TODO aggiungere le altre 2 astrazioni, oppure aggiungerle in una seconda UI?
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

            // Load preferences
            const prefs = await instance.getPreferenceCount();
            for(var i=0; i<prefs; i++)
                App.preferences.push(await instance.userPreferences(App.account, i));

            web3.eth.getBlockNumber(function(error, block) { 

                ////
                // Add listeners
                ////

                let from = block - App.listenPeriod;
                App.initBlock = block;
                
                if(from < 0) from = 0;
                
                // Access
                instance.UserAccess({}, {fromBlock: App.initBlock, toBlock: 'latest'}).watch(function(error, event) { 
                    
                    if(!error && event.args._user == App.account)
                        alert("Wow, you have now access to " + web3.toUtf8(event.args._content) + "!");
                });

                // Two Consumption listeners
                    // one starts few blocks earlier to fill the notification sidebar up
                instance.UserConsume({}, {fromBlock: from, toBlock: 'latest'}).watch(function(error, event) {

                    if(!error) {
                        
                        const content = web3.toUtf8(event.args._content);
                        const address = event.args._user.toString();
                        addUserNotification(address, "has viewed", content);
                        console.log("Consumption " + address + " " + content);
                    }
                });

                    // the second starts from the current block to listen to new user's consumption and notify him about leaving a feedback
                instance.UserConsume({}, {fromBlock: App.initBlock, toBlock: 'latest'}).watch(function(error, event) {

                    if(!error) {
                        
                        if(address == App.account)
                            if(confirm("Would you like to leave a feedback to " + content + "?"))
                                App.showRatingPopup(content);
                    }
                });



                // Premium subscription
                instance.NewPremiumUser({}, {fromBlock: App.initBlock, toBlock: 'latest'}).watch(function(error, event) {

                    if(!error && event.args._user == App.account)
                        alert("Wow, you are now subscribed to premium service! You can now get our contents for free!");
                });

                // New Popular/Latest
                // TODO filter authors/genres
                instance.NewPopularByAuthor({}, {fromBlock: from, toBlock: 'latest'}).watch(function(error, event) {

                    if(!error && App.preferences.indexOf(event.args._author) != -1) { // Author is in my preferences
                        appendNotification(web3.toUtf8(event.args._author), "<b>has a new popular content:</b>", web3.toUtf8(event.args._content));
                    }
                });


                instance.NewPopularByGenre({}, {fromBlock: from, toBlock: 'latest'}).watch(async(error, event) => {

                    if(!error && App.preferences.indexOf(event.args._genre) != -1){
                        appendNotification(web3.toUtf8(event.args._genre), "<b>has a new popular content:</b>", web3.toUtf8(event.args._content));
                    }
                });
                

                instance.NewLatestByAuthor({}, {fromBlock: from, toBlock: 'latest'}).watch(function(error, event) {

                    if(!error && App.preferences.indexOf(event.args._author) != -1){
                        appendNotification(web3.toUtf8(event.args._author), "<b>published a new content:</b>", web3.toUtf8(event.args._content));
                    }
                });

                instance.NewLatestByGenre({}, {fromBlock: from, toBlock: 'latest'}).watch(function(error, event) {

                    if(!error && App.preferences.indexOf(event.args._genre) != -1){
                        appendNotification(web3.toUtf8(event.args._genre), "<b>has a new content:</b>", web3.toUtf8(event.args._content));
                    }
                });

                // Author payed
                instance.AuthorPayed({}, {fromBlock: App.initBlock, toBlock: 'latest'}).watch(function(error, event) {

                    console.log(web3.toUtf8(event.args._author) + " got payed " + web3.fromWei(event.args._reward, 'ether'));
                });




                instance.tryy({}, {fromBlock: 0, toBlock: 'latest'}).watch(function(error, event) {

                    console.log("------------ " + event.args.a);
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

            // Show premium label
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

            const contentBytes = web3.fromUtf8(content);
            const manager = await App.contracts.BaseContent.at(await instance.contentMap(contentBytes));
            const price = await manager.price();

            alert("REMINDER: You are buying the content " + content + " at the cost of " +
                web3.fromWei(price, 'ether') + " ether. Confirm or reject the transation on metamask.");

            transaction = await instance.getContent(contentBytes ,{from: App.account, value: price});
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

            const premiumCost = await instance.premiumCost();

            alert("REMINDER: You are buying a premium subscription at the cost of " +
                web3.fromWei(premiumCost, "ether") + " ether. Confirm or reject the transation on metamask.");

            transaction = await instance.buyPremium({from: App.account, value: premiumCost});
            $("#accountAddress").html("Your Account: " + App.account + ": <b>PREMIUM</b>");
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

                const content = web3.fromUtf8(selector.val());
                const manager = await App.contracts.BaseContent.at(await instance.contentMap(contentBytes));
                const price = await manager.price();

                alert("REMINDER: You are gifting a the content" + selector.val() + " to " + input.val() + " at the cost of " +
                    web3.fromWei(price, "ether") + " ether. Confirm or reject the transation on metamask.");
                transaction = await instance.giftContent(content, input.val(), {from: App.account, value: price});
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

                const premiumCost = await instance.premiumCost();

                alert("REMINDER: You are gifting a premium subscription to " + input.val() + " at the cost of " +
                     web3.fromWei(premiumCost, 'ether') + " ether. Confirm or reject the transation on metamask.");

                transaction = await instance.giftPremium(input.val(), {from: App.account, value: premiumCost});
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
        });

        // TODO Fare in modo che un autore possa linkare il contratto a piacere

    },


    ////////////////////////////////////////////
    ////          Content list info         ////
    ////////////////////////////////////////////


    /**
     * Get inforamtion about a most popular or latest published content 
     */
    getInfo: function() {

        var input = $('#mostPopular');
        var selector = $('#getInfoSelect');
        var categorySelector = $('#getCategorySelect');
        var result = $('#infoResult');

        App.contracts.Catalog.deployed().then(async (instance) => {

            var content;
            var category = categorySelector.val();
            var inputString;

            result.html("Loading...");

            inputString = web3.fromUtf8(input.val());

            // Select filter
            switch (selector.val()) {

                // Popular / Latest content
                case "authorPop":
                    content = web3.toUtf8(await instance.getMostPopularByAuthor(inputString));
                    break;
                case "genrePop":                
                    content = web3.toUtf8(await instance.getMostPopularByGenre(inputString));
                    break;
                case "authorLate":                
                    content = web3.toUtf8(await instance.getLatestByAuthor(inputString));
                    break;
                case "genreLate":                
                    content = web3.toUtf8(await instance.getLatestByGenre(inputString));
                    break;

                // Most rated content by category
                case "bestOfCategory":
                    content = web3.toUtf8(await instance.getMostRated(App.categoryIds[category]));
                    break;
                case "bestOfAuthorCategory":                
                    content = web3.toUtf8(await instance.getMostRatedByAuthor(inputString, App.categoryIds[category]));
                    break;
                case "bestOfGenreCategory":                
                    content = web3.toUtf8(await instance.getMostRatedByGenre(inputString, App.categoryIds[category]));
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
    ////    Filter Content Notifications    ////
    ////////////////////////////////////////////


    filter: function() {

        var input = $('#filterInput');

        App.contracts.Catalog.deployed().then(async (instance) => {

            if(input.val() != "")
                await instance.addPreference(web3.fromUtf8(input.val()));
            else
                alert("Empty field");
        });             
    },

    ////////////////////////////////////////////
    ////         Show Content Popup         ////
    ////////////////////////////////////////////


    /**
     * Show the popup with all the information about a content, and the possibility to buy it
     * @param content The selected content
     */
    showPurchasePopup: function(content){

        // Load content's contracts for more info
        const popup = $('#buyModal');
        const popupBody = $(".modal-body");
        const buyBtn = $(".btn-buy");
        const consumeBtn = $(".btn-consume");
        const buyGiftBtn = $(".btn-buygift");

        popupBody.html("Loading data...");

        
        // Add click listeners
        if(App.isPremium) {
            // Change buy function whether the user is premium or not

            buyBtn.click({param: content}, function(event) {
                App.buyContentPremium(event.data.param);
                console.log("Buy " + event.data.param);
            });
        }
        else {

            buyBtn.click({param: content}, function(event) {
                App.buy(event.data.param);
                console.log("Buy " + event.data.param);
            });
        }

        consumeBtn.click({param: content}, function(event) {
            
            App.consume(event.data.param);
            console.log("consume " + event.data.param);
        });

        buyGiftBtn.click({param: content}, function(event) {
            App.giftContent(event.data.param);
            console.log("buy gift  " + event.data.param);
        });
        

        App.contracts.Catalog.deployed().then(async(instance) => {

            // Load content
            const contentAddress = await instance.contentMap(web3.fromUtf8(content));
            const contentManager = await App.contracts.BaseContent.at(contentAddress);

            // Content Info
            const title = web3.toUtf8(await contentManager.title());
            const author = web3.toUtf8(await contentManager.author());
            const genre = web3.toUtf8(await contentManager.getGenre());
            const price = web3.fromWei(await contentManager.price(), 'ether');
            const views = await contentManager.views();
            const access = await contentManager.accessRightMap(App.account);
            const quality = await contentManager.getRate(0); // Quality
            const priceFair = await contentManager.getRate(1); // Price Fairness
            const rewatch = await contentManager.getRate(2); // Rewatchable
            const family = await contentManager.getRate(3); // Family Friendly

            let str = "<h3>Content's details:</h3></br>" +
                        "<b>Title:</b> " + title +
                        "</br><b>Author:</b> " + author + 
                        "</br><b>Genre:</b> " + genre + 
                        "</br><b>Price:</b> " + price + " ether"+
                        "</br><b>Views:</b> " + views +
                        "</br></br>";

            // Rating portion
            str += loadRating();
            // Fill up popup body
            popupBody.html(str);
            // Display rating stars
            $('#rateDiv > #qualityRate').html(createRateOfContent(quality));
            $('#rateDiv > #priceRate').html(createRateOfContent(priceFair));
            $('#rateDiv > #rewatchRate').html(createRateOfContent(rewatch));
            $('#rateDiv > #familyRate').html(createRateOfContent(family));

            // Display buy or consum button, depending on the user's access rights to that content
            if(access) {
                buyBtn.hide();
                consumeBtn.show();
            }
            else {
                buyBtn.show();
                consumeBtn.hide();
            }
        });
    },

    ////////////////////////////////////////////
    ////         Show Content Popup         ////
    ////////////////////////////////////////////

    /**
     * Show the popup with all the information about a content, and the possibility to buy it
     * @param content the content to rate
     */
    showRatingPopup: function(content) {

        $('#rateModal').modal();

        const popupBody = $(".modal-body");
        const rateBody = $("#toRateDiv");

        rateBody.html(loadRating());
        $('#toRateDiv > #qualityRate').html(createRating("quality"));
        $('#toRateDiv > #priceRate').html(createRating("price"));
        $('#toRateDiv > #rewatchRate').html(createRating("rewatch"));
        $('#toRateDiv > #familyRate').html(createRating("family"));        

        popupBody.html("<h2>"+content+"</h2>");

        $('.btn-rate').click({param: content}, function(event) {
            
            App.rateContent(event.data.param);
            console.log("rated " + event.data.param);
            $('.btn-rate').unbind("click");
        });
    },

    /**
     * Rate a content
     * @param content the content to rate
     */
    rateContent: function(content) {

        // Get the stars checked by the user
        const quality = getCheckedStars('quality');
        const price = getCheckedStars('price');
        const rewatch = getCheckedStars('rewatch');
        const family = getCheckedStars('family');
        
        App.contracts.Catalog.deployed().then(async(instance) => {
           
            alert("REMINDER: You are rating the content " + content + ".Confirm or reject the transation on metamask.");
            await instance.rateContent(web3.fromUtf8(content), [quality, price, rewatch, family]);

        }).catch(function(error) {
            console.log(error);
            const errorS = "Error while processing, possible reasons:\n"+
                            " - One input field not valid;\n"+
                            " - Not enough balance;\n"+
                            " - Increase gas limit.";
            alert(errorS);
        });
    }
};

// Call init whenever the window loads
$(function() {
    $(window).load(function() {
        App.init();
    });
});