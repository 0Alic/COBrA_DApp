App = {

    ////////////////////////////////////////////
    ////            State Variables         ////
    ////////////////////////////////////////////

    account: '0x0',                 // current ehtereum account
    isPremium: false,               // is the account premium
    categoryIds: {"quality": 0, "priceFairness": 1, 
                    "rewatchable": 2, "familyFriendly": 3, "average": 4}, // categories Id
    listenPeriod: 30,               // app listens for some events from the last 30 blocks
    preferences: [],                // user's preferences
    maxRating: 0,                   // max value to rate a content


    /* Create the event listeners */
    listenForEvents: function() {

        Res.contracts.Catalog.deployed().then(async(instance) => {

            // Load preferences
            const prefs = await instance.getPreferenceCount();
            for(var i=0; i<prefs; i++)
                App.preferences.push(await instance.userPreferences(App.account, i));

            web3.eth.getBlockNumber(function(error, block) { 

                ////
                // Add listeners
                ////
                let from = block - App.listenPeriod;
                if(from < 0) from = 0;
                
                // Access granted to content
                instance.UserAccess({}, {fromBlock: block, toBlock: 'latest'}).watch(function(error, event) { 
                    
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
                    }
                });

                    // the second starts from the current block to listen to new user's consumption and notify him about leaving a feedback
                instance.UserConsume({}, {fromBlock: block, toBlock: 'latest'}).watch(function(error, event) {

                    if(!error) {
                        const content = web3.toUtf8(event.args._content);
                        const address = event.args._user.toString();
                        if(address == App.account)
                            if(confirm("Would you like to leave a feedback to " + content + "?"))
                                App.showRatingPopup(content);
                    }
                });

                // Premium subscription
                instance.NewPremiumUser({}, {fromBlock: block, toBlock: 'latest'}).watch(function(error, event) {

                    if(!error && event.args._user == App.account)
                        alert("Wow, you are now subscribed to premium service! Now you can get our contents for free!");
                });

                // New Popular/Latest
                    // Fill the sidebar in case the user has set some preferences
                instance.NewPopularByAuthor({}, {fromBlock: from, toBlock: 'latest'}).watch(function(error, event) {

                    if(!error && App.preferences.indexOf(event.args._author) != -1) { // Author is in my preferences
                        appendNotification(web3.toUtf8(event.args._author), "<b>has a new popular content:</b>", web3.toUtf8(event.args._content));
                    }
                });


                instance.NewPopularByGenre({}, {fromBlock: from, toBlock: 'latest'}).watch(async(error, event) => {

                    if(!error && App.preferences.indexOf(event.args._genre) != -1){ // Genre is in my preferences
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
                instance.AuthorPayed({}, {fromBlock: block, toBlock: 'latest'}).watch(function(error, event) {

                    appendNotification(web3.toUtf8(event.args._author), "<b>got rewarded!</b> with", web3.fromWei(event.args._reward, 'ether') + " ether");
                });

                // COBrA shuts down
                instance.COBrAShutDown({}, {fromBlock: block, toBlock: 'latest'}).watch(function(error, event) {

                    alert("COBrA is closed by the owner");
                });
            });
        })
    },


    ////////////////////////////////////////////
    ////            Render function         ////
    ////////////////////////////////////////////


    render: function() {

        var loader = $("#loader");
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
        Res.contracts.Catalog.deployed().then(async (instance) => {

            // Show premium label
            if(await instance.isPremium(App.account)) {
                App.isPremium = true;
                $("#accountAddress").html("Your Account: " + App.account + ": <b>PREMIUM</b>");
                $('#buyPremiumBtn').hide();
            }
            else {
                App.isPremium = false;
                $("#accountAddress").html("Your Account: " + App.account);
                $('#buyPremiumBtn').show();
            }

            // Store max rating
            App.maxRating = parseInt((await instance.maxRate()).toString());

            // Show Destroy button only to the owner
            if(App.account == await instance.COBrA_CEO_Address()) 
                $('#suicideDiv').show();
            
            return instance.getContentList();
 
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
                var contentTemplate ="<tr onclick='App.showPurchasePopup(this.id)' id='"+title+
                                    "' style='cursor: pointer' data-toggle='modal' data-target='#buyModal'><th>" +
                                    (i+1) + "</th><td>" + title + "</td></tr>";
                contentList.append(contentTemplate);

                // Render content option
                var contentOption = '<option value="' + title + '">' + title + '</option>';
                contentSelect.append(contentOption);
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

        Res.contracts.Catalog.deployed().then(async(instance) => {

            const contentBytes = web3.fromUtf8(content);
            const manager = await Res.contracts.BaseContent.at(await instance.contentMap(contentBytes));
            const price = await manager.price();

            alert("REMINDER: You are buying the content " + content + " at the cost of " +
                web3.fromWei(price, 'ether') + " ether. Confirm or reject the transation on metamask.");

            transaction = await instance.getContent(contentBytes ,{from: App.account, value: price});
            
        }).catch(function(error) {
            console.log(error);
            showErrorAlert("You have already access to this content");
        });
    },

    /**
     * Get a content for free
     * @param content: the content to get
     */
    buyContentPremium: function(content) {

        Res.contracts.Catalog.deployed().then(async(instance) => {

            contentBytes = web3.fromUtf8(content);
            alert("REMINDER: You are buying the content " + content + " FOR FREE thanks to our premium service."
                    + "Confirm or reject the transation on metamask.");

            transaction = await instance.getContentPremium(contentBytes ,{from: App.account});
            
        }).catch(function(error) {
            console.log(error);
            showErrorAlert("You have already access to this content");
        });
    },

    /**
     * Consume a content
     * @param content: the content to consume
     */
    consume: function(content) {
        
        Res.contracts.Catalog.deployed().then(async (instance) => {
            
            const contentAddress = await instance.contentMap(web3.fromUtf8(content));
            const contentManager = await Res.contracts.BaseContent.at(contentAddress);

            contentManager.consumeContent();

        }).catch(function(error) {
            console.log(error);
            showErrorAlert();
        });
    },


    ////////////////////////////////////////////
    ////            Buy Premium             ////
    ////////////////////////////////////////////


    /**
     * Buy the premium service
     */
    buyPremium: function() {

        Res.contracts.Catalog.deployed().then(async (instance) => {

            const premiumCost = await instance.premiumCost();

            alert("REMINDER: You are buying a premium subscription at the cost of " +
                web3.fromWei(premiumCost, "ether") + " ether. Confirm or reject the transation on metamask.");

            transaction = await instance.buyPremium({from: App.account, value: premiumCost});

            $("#accountAddress").html("Your Account: " + App.account + ": <b>PREMIUM</b>");
            console.log("Premium got");
            
        }).catch(function(error) {
            console.log(error);
            showErrorAlert("Address not valid");
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
     * @param content: the content to consume
     */
    giftContent: function(content) {

        Res.contracts.Catalog.deployed().then(async (instance) => {

            var input = $('#giftAddressInput');

            if(input.val() == "") {
                alert("Empty field");
            }
            else {

                const contentBytes = web3.fromUtf8(content);
                const manager = await Res.contracts.BaseContent.at(await instance.contentMap(contentBytes));
                const price = await manager.price();

                alert("REMINDER: You are gifting a the content " + content + " to " + input.val() + " at the cost of " +
                    web3.fromWei(price, "ether") + " ether. Confirm or reject the transation on metamask.");

                transaction = await instance.giftContent(content, input.val(), {from: App.account, value: price});
                console.log("Content gifted");
                $('#contentGiftDiv').hide();
            }
        }).catch(function(error) {
            console.log(error);
            showErrorAlert("Address not valid", "The destinatary has already access to this content");
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

        Res.contracts.Catalog.deployed().then(async (instance) => {

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
            showErrorAlert();
        });
    },

    ////////////////////////////////////////////
    ////            Publish Content         ////
    ////////////////////////////////////////////

    /**
     * Publish a new content
     */
    publish: function() {

        Res.contracts.Catalog.deployed().then(async(instance) => {

            const address = $('#publishInput').val();

            if(address == "")
                alert("Empty field");
            else {
                alert("REMINDER: You are linking your content to the Catalog. Confirm or reject the transaction on Metamask.");
                
                await instance.addContent(address);
                App.render();
            }
        }).catch(function(error) {
            console.log(error);
            showErrorAlert();
        });
    },


    ////////////////////////////////////////////
    ////          Content list info         ////
    ////////////////////////////////////////////


    /**
     * Get information about a most popular or latest published content 
     */
    getInfo: function() {

        var input = $('#mostPopular');
        var selector = $('#getInfoSelect');
        var categorySelector = $('#getCategorySelect');
        var result = $('#infoResult');

        Res.contracts.Catalog.deployed().then(async (instance) => {

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

    /**
     * Add a new user preference to personalise the notifications
     */
    filter: function() {

        var input = $('#filterInput');

        Res.contracts.Catalog.deployed().then(async (instance) => {

            if(input.val() != ""){
                alert("REMINDER: You are creating a filter for " + input.val() + " to receive notification from."+
                        "Confirm or reject the transaction on Metamask");

                await instance.addPreference(web3.fromUtf8(input.val()));
            }
            else
                alert("Empty field");

        }).catch(function(error) {
            console.log(error);
            showErrorAlert();
        });;             
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
        const popupBody = $(".modal-body");
        const buyBtn = $(".btn-buy");
        const consumeBtn = $(".btn-consume");
        const buyGiftBtn = $(".btn-buygift");

        popupBody.html("Loading data...");

        
        // Add click listeners (because they rely on current param, i.e. the selected content)
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
        

        Res.contracts.Catalog.deployed().then(async(instance) => {

            // Load content
            const contentAddress = await instance.contentMap(web3.fromUtf8(content));
            const contentManager = await Res.contracts.BaseContent.at(contentAddress);

            // Content Info
            const title = web3.toUtf8(await contentManager.title());
            const author = web3.toUtf8(await contentManager.author());
            const genre = web3.toUtf8(await contentManager.getGenre());
            const price = web3.fromWei(await contentManager.price(), 'ether');
            const views = await contentManager.views();
            const access = await contentManager.accessRightMap(App.account);
            const quality = await contentManager.getRate(App.categoryIds["quality"]);
            const priceFair = await contentManager.getRate(App.categoryIds["priceFairness"]);
            const rewatch = await contentManager.getRate(App.categoryIds["rewatchable"]);
            const family = await contentManager.getRate(App.categoryIds["familyFriendly"]);

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

            // Display buy or consume button, depending on the user's access rights to that content
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
    ////          Rating Functions          ////
    ////////////////////////////////////////////

    /**
     * Show the popup with all the information about a content with the possibility to buy it
     * @param content the content to rate
     */
    showRatingPopup: function(content) {

        $('#rateModal').modal();

        const popupBody = $(".modal-body");
        const rateBody = $("#toRateDiv");

        rateBody.html(loadRating());
        $('#toRateDiv > #qualityRate').html(allowRating("quality"));
        $('#toRateDiv > #priceRate').html(allowRating("price"));
        $('#toRateDiv > #rewatchRate').html(allowRating("rewatch"));
        $('#toRateDiv > #familyRate').html(allowRating("family"));        

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
        
        Res.contracts.Catalog.deployed().then(async(instance) => {
           
            alert("REMINDER: You are rating the content " + content + ".Confirm or reject the transation on metamask.");
            await instance.rateContent(web3.fromUtf8(content), [quality, price, rewatch, family]);

        }).catch(function(error) {
            console.log(error);
            showErrorAlert("One input field not valid");
        });
    },

    ////////////////////////////////////////////
    ////         COBrA SelfDestruct         ////
    ////////////////////////////////////////////

    /**
     * Destroy the Catalog smart contract. Iteratively, destroy all the attached contents
     */
    destructCOBrA: function() {

        if(confirm("ARE YOU SURE TO DESTROY COBrA?? THIS STEP IS NOT REVERTIBLE!")) {

            Res.contracts.Catalog.deployed().then(async(instance) => {

                await instance.destructCOBrA();
                alert("COBrA it's gone");
            });
        }
    }
};