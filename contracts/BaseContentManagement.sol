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
    
    // Rating information
    uint public constant SUM = 0;
    uint public constant TIMES = 1;
    uint[2][] public ratingMap;
    
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


    modifier validCategory(uint _category) {
        
        require(_category == uint(Catalog.Categories.Quality) ||
                _category == uint(Catalog.Categories.PriceFairness) ||
                _category == uint(Catalog.Categories.Rewatchable) ||
                _category == uint(Catalog.Categories.FamilyFriendly), "Invalid cateogry");
                
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
        
        ratingMap = new uint[2][](catalog.numCategories());

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
    
    
    function rateContent(uint[] ratings) external isCatalog {
        
        ratingMap[uint(Catalog.Categories.Quality)][SUM] += ratings[uint(Catalog.Categories.Quality)];
        ratingMap[uint(Catalog.Categories.PriceFairness)][SUM] += ratings[uint(Catalog.Categories.PriceFairness)];
        ratingMap[uint(Catalog.Categories.Rewatchable)][SUM] += ratings[uint(Catalog.Categories.Rewatchable)];
        ratingMap[uint(Catalog.Categories.FamilyFriendly)][SUM] += ratings[uint(Catalog.Categories.FamilyFriendly)];

        ratingMap[uint(Catalog.Categories.Quality)][TIMES] ++;
        ratingMap[uint(Catalog.Categories.PriceFairness)][TIMES] ++;
        ratingMap[uint(Catalog.Categories.Rewatchable)][TIMES] ++;
        ratingMap[uint(Catalog.Categories.FamilyFriendly)][TIMES] ++;
        
        catalog.notifyRating(title, uint8(Catalog.Categories.Quality));
        catalog.notifyRating(title, uint8(Catalog.Categories.PriceFairness));
        catalog.notifyRating(title, uint8(Catalog.Categories.Rewatchable));
        catalog.notifyRating(title, uint8(Catalog.Categories.FamilyFriendly));
    }
    
    
    function getRate(uint _category) external view validCategory(_category) returns(uint)  {
        
        if(ratingMap[_category][TIMES] == 0)
            return 0;
        else 
            return uint(ratingMap[_category][SUM] / ratingMap[_category][TIMES]);
    }
}
