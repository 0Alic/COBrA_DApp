// Artifacts == truffle's contract abstraction
var Catalog = artifacts.require("./Catalog.sol");
var PhotoContent = artifacts.require("./PhotoContentManagement");
var SongContent = artifacts.require("./SongContentManagement");
var VideoContent = artifacts.require("./VideoContentManagement");
var ContentManager = artifacts.require("./BaseContentManagement");
var web3;

var Web3= require ("web3");

if (typeof web3 !== 'undefined') {
	web3 = new Web3(web3.currentProvider);
} else {
	web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
}


module.exports = function(deployer) {

    deployer.then(async () => {

        /////
        // UN-COMMENT this for deployment on ropsten
        /////
        /*
        console.log("\n----Deploying Catalog----\n");
        const catalog = await deployer.deploy(Catalog);
        */

        //////////////

        /////
        // UN-COMMENT this for local deployment
        /////
        
        const catalogCEO = web3.eth.accounts[0];

        const author1 = web3.eth.accounts[1];
        const author2 = web3.eth.accounts[2];
        const author3 = web3.eth.accounts[3];
        const author4 = web3.eth.accounts[4];

        const watcher1 = web3.eth.accounts[6];
        const watcher2 = web3.eth.accounts[7];


        const contentCost1 = 100000000000000;
        const contentCost2 = 2000000000000000;
        const contentCost3 = 4000000000000000;
        const contentCost4 = 4000000000000000;

        const contentTitle1 = web3.fromAscii("Panoramica Lajatico");
        const contentTitle2 = web3.fromAscii("La ballata di Fantozzi");
        const contentTitle22 = web3.fromAscii("Carlo Martello");
        const contentTitle3 = web3.fromAscii("Uncle Scrooge: Olio su tela");
        const contentTitle33 = web3.fromAscii("Uncle Scrooge: Painting");
        const contentTitle41 = web3.fromAscii("Solidity Tutorial");
        const contentTitle42 = web3.fromAscii("Create your crypto");


        const authorName1 =  web3.fromAscii("Artista");
        const authorName2 =  web3.fromAscii("Paolo Villaggio");
        const authorName3 =  web3.fromAscii("Carl Barks");
        const authorName4 =  web3.fromAscii("ChainChannel");

        console.log("\n----Deploying Catalog----\n");
        const catalog = await deployer.deploy(Catalog, {from: catalogCEO});

        
        // Deploy a few stuff
        console.log("\n----Deploying some Contents----\n");
        const content1 = await deployer.deploy(PhotoContent, authorName1, contentTitle1, contentCost1, catalog.address, {from: author1});

        const content3 = await deployer.deploy(PhotoContent, authorName3, contentTitle3, contentCost3, catalog.address, {from: author3});
        const content33 = await deployer.deploy(PhotoContent, authorName3, contentTitle33, contentCost3, catalog.address, {from: author3});
        const content41 = await deployer.deploy(VideoContent, authorName4, contentTitle41, contentCost4, catalog.address, {from: author4});
        const content42 = await deployer.deploy(VideoContent, authorName4, contentTitle42, contentCost4, catalog.address, {from: author4});

        // Attach them to the Catalog
        console.log("\n----Attach contents to Catalog----\n");
        await catalog.addContent(content1.address, {from: author1});
        await catalog.addContent(content41.address, {from: author4});

        await catalog.addContent(content3.address, {from: author3});
        await catalog.addContent(content42.address, {from: author4});
        await catalog.addContent(content33.address, {from: author3});

        // Add some visual
        await catalog.getContent(contentTitle3, {from: watcher2, value: contentCost3});
        await content3.consumeContent({from: watcher2});
        await catalog.rateContent(contentTitle3, [8,8,7,4], {from: watcher2});

        await catalog.getContent(contentTitle1, {from: watcher1, value: contentCost1});
        await content1.consumeContent({from: watcher1});
        await catalog.rateContent(contentTitle1, [4,4,3,10], {from: watcher1});

        await catalog.getContent(contentTitle41, {from: watcher1, value: contentCost4});
        await catalog.getContent(contentTitle41, {from: watcher2, value: contentCost4});
        await content41.consumeContent({from: watcher1});

        await catalog.rateContent(contentTitle41, [8,6,8,4], {from: watcher1});
        await content41.consumeContent({from: watcher2});
        await catalog.rateContent(contentTitle41, [8,6,9,4], {from: watcher2});

        await catalog.getContent(contentTitle41, {from: watcher1, value: contentCost4});
        await catalog.getContent(contentTitle41, {from: watcher2, value: contentCost4});
        await content41.consumeContent({from: watcher1});

        await catalog.rateContent(contentTitle41, [9,4,8,6], {from: watcher1});
        await content41.consumeContent({from: watcher2});
        await catalog.rateContent(contentTitle41, [8,8,10,4], {from: watcher2});

        console.log("\n----Deploy, attach and view a few more contents----\n");
        const content2 = await deployer.deploy(SongContent, authorName2, contentTitle2, contentCost2, catalog.address, {from: author2});
        const content22 = await deployer.deploy(SongContent, authorName2, contentTitle22, contentCost2, catalog.address, {from: author2});
        await catalog.addContent(content2.address, {from: author2});
        await catalog.addContent(content22.address, {from: author2});

        await catalog.getContent(contentTitle42, {from: watcher1, value: contentCost4});
        await catalog.getContent(contentTitle42, {from: watcher2, value: contentCost4});
        await content42.consumeContent({from: watcher1});
        await catalog.rateContent(contentTitle42, [5,4,6,4], {from: watcher2});
        await content42.consumeContent({from: watcher2});
        await catalog.rateContent(contentTitle42, [10,7,10,6], {from: watcher2});

        await catalog.getContent(contentTitle2, {from: watcher1, value: contentCost2});
        await content2.consumeContent({from: watcher1});
        await catalog.rateContent(contentTitle2, [5,6,7,8], {from: watcher1});
        await catalog.getContent(contentTitle2, {from: watcher1, value: contentCost2});
        await content2.consumeContent({from: watcher1});
        await catalog.rateContent(contentTitle2, [7,7,7,8], {from: watcher1});
        
    }); 
};
