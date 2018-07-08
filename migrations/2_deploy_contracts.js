
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

const catalogCEO = web3.eth.accounts[0];

const author1 = web3.eth.accounts[1];
const author2 = web3.eth.accounts[2];
const author3 = web3.eth.accounts[3];

const watcher1 = web3.eth.accounts[5];
const watcher2 = web3.eth.accounts[6];


const contentCost = 1000000000000000;

const contentTitle1 = web3.fromAscii("I cani in spiaggia");
const contentTitle2 = web3.fromAscii("I llama in montagna");
const contentTitle3 = web3.fromAscii("Stay Alpacaed");

const authorName1 =  web3.fromAscii("cane");
const authorName2 =  web3.fromAscii("llama");
const authorName3 =  web3.fromAscii("alpaca");

module.exports = function(deployer) {

    deployer.then(async () => {

        const catalog = await deployer.deploy(Catalog, {from: catalogCEO});

        // Deploy a few stuff
        const content1 = await deployer.deploy(PhotoContent, authorName1, contentTitle1, catalog.address, {from: author1});
    //    const ph2 = await deployer.deploy(PhotoContent, web3.fromAscii("cane"), web3.fromAscii("I cani al mare"), catalog.address);
    //    const ph3 = await deployer.deploy(PhotoContent, web3.fromAscii("gatto"), web3.fromAscii("I gatti si lavano"), catalog.address);

        const content2 = await deployer.deploy(SongContent, authorName2, contentTitle2, catalog.address, {from: author2});
        const content3 = await deployer.deploy(SongContent, authorName3, contentTitle3, catalog.address, {from: author3});

    //    const vi1 = await deployer.deploy(VideoContent, web3.fromAscii("pranK02"), web3.fromAscii("Epico scherzo"), catalog.address);
    //    const vi2 = await deployer.deploy(VideoContent, web3.fromAscii("pranK03"), web3.fromAscii("NO CLICKBAIT"), catalog.address);

        // Attach them to the Catalog
        await catalog.addContent(content1.address, {from: author1});
    //    await catalog.addContent(vi1.address);
    //    await catalog.addContent(ph2.address);

        await catalog.addContent(content2.address, {from: author2});
        await catalog.addContent(content3.address, {from: author3});

    //    await catalog.addContent(vi2.address);
    //    await catalog.addContent(ph3.address);

        // Add some visual
        await catalog.getContent(contentTitle2, {from: watcher1, value: contentCost});
        await content2.consumeContent({from: watcher1});
        await catalog.getContent(contentTitle2, {from: watcher1, value: contentCost});
        await content2.consumeContent({from: watcher1});

        await catalog.getContent(contentTitle3, {from: watcher2, value: contentCost});
        await content3.consumeContent({from: watcher2});
        await catalog.getContent(contentTitle1, {from: watcher1, value: contentCost});
        await content1.consumeContent({from: watcher1});
    }); 
};
