pragma solidity ^0.4.18;

import "./BaseContentManagement.sol";
//import "./Catalog.sol";

contract PhotoContentManagement is BaseContentManagement {

    constructor(bytes32 _author,
                bytes32 _title,
                uint _price,
                Catalog _catalogAddress) BaseContentManagement(_author,
                                            _title, 
                                            _price,
                                            _catalogAddress) public {
        
    }
    
    function getGenre() public pure returns(bytes32) {
        // "photo"
        return 0x70686f746f000000000000000000000000000000000000000000000000000000;
    }
}



contract SongContentManagement is BaseContentManagement {

    constructor(bytes32 _author,
                bytes32 _title, 
                uint _price,
                Catalog _catalogAddress) BaseContentManagement(_author,
                                            _title, 
                                            _price,
                                            _catalogAddress) public {
        
    }
    
    function getGenre() public pure returns(bytes32) {
        // "song"
        return 0x736f6e6700000000000000000000000000000000000000000000000000000000;
    }
}



contract VideoContentManagement is BaseContentManagement {

    constructor(bytes32 _author,
                bytes32 _title, 
                uint _price,
                Catalog _catalogAddress) BaseContentManagement(_author,
                                            _title, 
                                            _price,
                                            _catalogAddress) public {
        
    }
    
    function getGenre() public pure returns(bytes32) {
        // "video"
        return 0x766964656f000000000000000000000000000000000000000000000000000000;
    }   
}