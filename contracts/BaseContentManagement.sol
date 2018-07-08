pragma solidity ^0.4.18;

import "./Catalog.sol";

contract BaseContentManagement {
    
    /// Content information
    address public authorAddress;
    Catalog public catalog;
    bytes32 public author;
    bytes32 public title;
    uint public views = 0;
    
    mapping(address => bool) public accessRightMap;
    
    
    /// @notice Check if the caller is the Catalog
    modifier isCatalog() {
        require(msg.sender == address(catalog), "The caller isn't the Catalog");
        _;
    }
    
    
    /// @notice Check if the user has access to the content
    /// @param _user the address of the user
    modifier hasAccess(address _user) {
        require(accessRightMap[_user] == true, "Access denied");
        _;
    }

    /// @notice Check if the user doens't already have the access to the content
    /// @param _user the address of the user
    modifier hasNoAccess(address _user) {
        require(accessRightMap[_user] == false, "Access already granted");
        _;
    }


    // @notice returns the type of the content
    // @returns the genre of the content
    function getGenre() public pure returns(bytes32);



    constructor(bytes32 _author,
                bytes32 _title, 
                Catalog _catalogAddress) public {
        
        authorAddress = msg.sender;
        catalog = _catalogAddress;
        author = _author;
        title = _title;
        
        views = 0;
    }
    
    
    /// @notice grant the access at the content to the user
    /// @param _user the address of the user
    function grantAccess(address _user) external isCatalog hasNoAccess(_user) {
        accessRightMap[_user] = true;
    }
    
    
    /// @notice remove the access at the content to the user
    function consumeContent() external hasAccess(msg.sender) {

        accessRightMap[msg.sender] = false;
        
        if(!catalog.isPremium(msg.sender)){
            
            views++;
            catalog.notifyConsumption(title, msg.sender, false);
        }
        else {
            catalog.notifyConsumption(title, msg.sender, true);
        }
    }
}
