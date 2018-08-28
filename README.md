# COBrA_DApp

Client side application of https://github.com/0Alic/COBrA-Smart-Contract. The backend, i.e. the smart contracts are extended (as explained in the report). 

A simple content sharing platform backend / frontend on Ethereum blockchain. Final project of the Peer To Peer and Blockchains course at the university of Pisa, academic year 2017/2018.

The goal of this project concerns to learn how to write a client application (in this case a web app) interacting with Solidity smart contracts. This application has no practical use, and the contents have no real "content" to display (sorry if in the other page I have promised that the DApp would store the actual contents :sheep:).

In any case, I would like to thank [DApp univeristy](https://github.com/dappuniversity) with this great [tutorial](https://www.youtube.com/watch?v=3681ZYbDSSk) who helped me a lot at the beginning.


## Tools used

[NodeJS](https://nodejs.org/en/) to download [Truffle](https://truffleframework.com/truffle) and other useful packages. Truffle basically helps you to compile your smart contracts, provides you abstractions to interact with them in your client side application and helps you to deploy your contracts on a local blockchain or on real one.
- To create a local blockchain and get some fake accounts to interact with I have used [Ganache](https://truffleframework.com/ganache);
- to deploy on a real blockchain (in my case, the test chain called Ropsten) I have exploited an [Infura](https://infura.io/) node running an Ethereum client (instead of using Geth, since I would need to sync with Ropsten (download it) in order to interact with it) following this [tutorial](https://truffleframework.com/tutorials/using-infura-custom-provider).

Finally [Metamask](https://metamask.io/).
In any case, the tutorial linked above exaplains everything way better than I do here.

## Install and run

- Install NodeJS;
- Install Truffle `npm install truffle -g`
- `git clone` this repository;
- `npm install`;
- Install Metamask.

### Local blockchain

- Install Ganache;
- Run Ganache (my case, port  8545);
- Open Metamask, import account from Ganache (by copying the private key);
- `truffle migrate --reset` (it also compiles the contracts);
- new tab and `npm run dev` to run a local server to enable ajax calls (to retrieve JSON contracts);

### Ropsten

- Follow [this](https://truffleframework.com/tutorials/using-infura-custom-provider).

----------

Latex code for code highligthing:
- Javascript: [gist](https://gist.github.com/sgmonda/96941051845f4430989454f1f208ada2) from sgmonda;
- Solidity: [github repo](https://github.com/s-tikhomirov/solidity-latex-highlighting) from s-tikhomirov.
