pragma solidity ^0.4.24;
import "./BaseContentManagement.sol";
import "./BaseContentImplement.sol"; 

contract Catalog {
    
    ///////////////////////////////////////////////////////////////////
    ///////                   State Variables                   ///////
    ///////////////////////////////////////////////////////////////////
    
    event UserAccess(address _user, bytes32 _content);
    event UserConsume(address _user, bytes32 _content);
    event NewPremiumUser(address _user);
    event NewPopularByAuthor(bytes32 _author, bytes32 _content);
    event NewPopularByGenre(bytes32 _genre, bytes32 _content);
    event NewLatestByAuthor(bytes32 _author, bytes32 _content);
    event NewLatestByGenre(bytes32 _genre, bytes32 _content);
    event ContentRated(bytes32 _content, uint8 _category);
    event AuthorPayed(bytes32 _author, uint _reward);
    event COBrAShutDown();
    
    // Utilities
    address public COBrA_CEO_Address;

    uint constant public authorRewardPeriod = 5; // author gets payed every 10 views
    
    uint constant public premiumCost = 0.04 ether; // 18 eur
    uint constant public premiumPeriod = 6170;  // more or less 24h

    uint public totalViews = 0;

    // Popular mappings
    mapping(address => uint) premiumUsers;
    mapping(bytes32 => BaseContentManagement) public contentMap;
    // author => content
    mapping(bytes32 => bytes32) latestAuthorMap;
    mapping(bytes32 => bytes32) latestGenreMap;
    mapping(bytes32 => bytes32) mostPopularAuthorMap;
    mapping(bytes32 => bytes32) mostPopularGenreMap;
    
    // Content List
    bytes32[] contentList;

    // Categories utilities
        // Note: Average is not a category, is just a placeholder to store the most rated content in general
    enum Categories { Quality, PriceFairness, Rewatchable, FamilyFriendly, Average } 
    uint constant public numCategories = 4;
    uint constant public minRate = 1;
    uint constant public maxRate = 10;

    // Rate mappings
    mapping(uint8 => bytes32) public mostRatedContent;
    // author => (category => content)
    mapping(bytes32 => mapping(uint8 => bytes32)) public mostRatedByAuthor;
    mapping(bytes32 => mapping(uint8 => bytes32)) public mostRatedByGenre;

    // User preferences
    mapping(address => bytes32[]) public userPreferences;
    
        
    ///////////////////////////////////////////////////////////////////
    ///////                     Modifiers                       ///////
    ///////////////////////////////////////////////////////////////////
    

    /// @notice check whether the sender is a premium account
    modifier isUserPremium(address _user) {
        require(block.number <= premiumUsers[_user], "User isn't active premium");
        _;
    }


    /// @notice check whether the sender is the CEO
    modifier isCEO() {
        require(msg.sender == COBrA_CEO_Address, "Only the CEO can destruct the Catalog ");
        _;
    }

    
    ///@notice Check if the payment is correct
    ///@param value payed
    ///@param price to be payed
    modifier priceCorrect(uint value, uint price) {
        require(value == price, "Sent incorrect value");
        _;
    }


    /// @notice check wheter the content is already deployed
    modifier isDeployed(bytes32 _content) {
        require(contentMap[_content] != address(0x0), "Content not deployed");
        _;
    }
    
    
    /// @notice check wheter the content is not deployed yet
    modifier isNotDeployed(address _content) {
        require(_content == address(0x0), "Content already deployed");
        _;
    }
    
    ///@notice Check if a given category is valid
    ///@param _category the category
    modifier validCategory(uint _category) {
        require(_category == uint(Categories.Quality) ||
                _category == uint(Categories.PriceFairness) ||
                _category == uint(Categories.Rewatchable) ||
                _category == uint(Categories.FamilyFriendly) ||
                _category == uint(Categories.Average), "Invalid cateogry");
                
        _;
    }
    
    ///@notice Check if an array of ratings is valid
    ///@param _ratings the rating array
    modifier validRating(uint[] _ratings) {
    
        require(_ratings.length == numCategories, "Rating array not valid");

        for(uint i=0; i<_ratings.length; i++) {
            require(_ratings[i] >= minRate, "Invalid lower bound rating");
            require(_ratings[i] <= maxRate, "Invalid upper bound rating");
        }
        _;
    }

    ///@notice Check if the sender is the manager of a given content
    ///@param _content the content
    modifier correctManager(bytes32 _content) {

        require(msg.sender == address(contentMap[_content]), "Caller isn't the content's manager");
        _;
    }

    
    ///////////////////////////////////////////////////////////////////
    ///////              Contract's functions                   ///////
    ///////////////////////////////////////////////////////////////////

    constructor() public {
        
        COBrA_CEO_Address = msg.sender;
    }


        ///////////////////////////////////
        ///         Modify the State    ///
        ///////////////////////////////////




    ///@notice Add a new content to the catalog, if not present
    ///@param _content The address of the content's contract
    function addContent(BaseContentManagement _content) public 
                                                isNotDeployed(contentMap[_content.title()]) {

        // Be sure the content's catalog address is "this" one        
        require(_content.catalog() == this, "Wrong stored Catalog address");
        require(_content.authorAddress() == msg.sender, "Caller isn't the content's author");

        contentMap[_content.title()] = _content;
        contentList.push(_content.title());
        
        // Update latest author's content
        latestAuthorMap[_content.author()] = _content.title();
        latestGenreMap[_content.getGenre()] = _content.title();
        
        emit NewLatestByAuthor(_content.author(), _content.title());
        emit NewLatestByGenre(_content.getGenre(), _content.title());
    }
    

    
    ///@notice Gain the access to a content
    ///@param _content the id of the content
    function getContent(bytes32 _content) external payable 
                                isDeployed(_content)
                                priceCorrect(msg.value, contentMap[_content].price()) {
        
        contentMap[_content].grantAccess(msg.sender);
        emit UserAccess(msg.sender, _content);
    }
    
    

    ///@notice Gain the premium access to a content
    ///@param _content the title of the content
    function getContentPremium(bytes32 _content) external 
                                            isDeployed(_content)
                                            isUserPremium(msg.sender) {
        
        contentMap[_content].grantAccess(msg.sender);
        emit UserAccess(msg.sender, _content);
    }
    
    

    ///@notice Let a user buy a premium account
    function buyPremium() external payable 
                                priceCorrect(msg.value, premiumCost) {
        
        premiumUsers[msg.sender] = block.number + premiumPeriod;
        emit NewPremiumUser(msg.sender);
    }
    
    
    
    ///@notice Give to a user the access to a content
    ///@param _content the id of the content
    ///@param _dest the address of the receiver
    function giftContent(bytes32 _content, address _dest) external payable 
                                priceCorrect(msg.value, contentMap[_content].price()) {
        
        contentMap[_content].grantAccess(_dest);
        emit UserAccess(_dest, _content);
    }
    
    
    
    ///@notice Give to a user the premium account
    ///@param _dest the address of the receiver
    function giftPremium(address _dest) external payable
                                priceCorrect(msg.value, premiumCost) {
                                    
        premiumUsers[_dest] = block.number + premiumPeriod;
        emit NewPremiumUser(_dest);
    }
    
    
    /// @notice Get a notification from a content manager that it was consumed
    /// @param _content the calling contract
    /// @param _user the sender
    /// @param _premiumView if the content was consumed by a premium user
    /// @dev this function should be called only by a ContentManagement contract
    function notifyConsumption(bytes32 _content, address _user, bool _premiumView) external  correctManager(_content){
        
        emit UserConsume(_user, _content);

        if(!_premiumView) totalViews++;        
  
        // Update current most popular content of the author
        updateMostPopularByAuthor(_content);

        // Update current most popular content of a genre
        updateMostPopularByGenre(_content);
   
        // Check for payment
        if(contentMap[_content].views() % authorRewardPeriod == 0){
            
            uint reward = computeReward(_content);
            contentMap[_content].authorAddress().transfer(reward);

            emit AuthorPayed(contentMap[_content].author(), reward); 
        }
    }

    /// @notice Rate a content
    /// @param _content The content to rate
    /// @param ratings The rating array   
    function rateContent(bytes32 _content, uint[] ratings) external validRating(ratings) {
        
        contentMap[_content].rateContent(ratings);
    }

    
    /// @notice Get a rating notification by the manager of a content
    /// @param _content The rated content
    function notifyRating(bytes32 _content) external correctManager(_content) {

        updateCategory(_content, uint8(Categories.Quality));
        updateCategory(_content, uint8(Categories.PriceFairness));
        updateCategory(_content, uint8(Categories.Rewatchable));
        updateCategory(_content, uint8(Categories.FamilyFriendly));

        uint sum = contentMap[_content].getRateSum();
        bytes32 _bestRatedContent = mostRatedContent[uint8(Categories.Average)];
        // Update best rated content
        if(_bestRatedContent == 0x0) {
            mostRatedContent[uint8(Categories.Average)] = _content;
        }
        else {

            if(sum > contentMap[_bestRatedContent].getRateSum())
                mostRatedContent[uint8(Categories.Average)] = _content;
        }

        // Update best rated by author
        updateBestRatedByAuthor(_content, sum);

        // Update best rated by genre
        updateBestRatedByGenre(_content, sum);    
    }
    

    /// @notice Add a user preference (author or genre)
    /// @param _label The name of the author or genre
    function addPreference(bytes32 _label) external {

        userPreferences[msg.sender].push(_label);
    }

    /// @notice Get the number of preferences of that user
    /// @return The number of preferences of that user
    function getPreferenceCount() external view returns(uint) {

        return userPreferences[msg.sender].length;
    } 
    
    
    
        ///////////////////////////////////
        ///             Views           ///
        ///////////////////////////////////


    /// @notice Check if a user is premium
    /// @param _user the requested user
    /// @return true if the user is premium, false otherwise
    function isPremium(address _user) public view returns(bool) {
        
        return block.number <= premiumUsers[_user];
    }
    
    
    /// @notice Get the list of contents and their number of views
    /// @return the list of the titles of the contents
    /// @return the list of the views of each content
    function getStatistics() external view returns(bytes32[], uint[]) {
        
        uint[] memory _viewList = new uint[](contentList.length);
        
        for(uint i = 0; i < contentList.length; i++)
            _viewList[i] = contentMap[contentList[i]].views();
            
        return (contentList, _viewList);
    }
    
    
    
    /// @notice Get list of the contents in the catalog
    /// @return the list of the titles of the contents
    function getContentList() external view returns(bytes32[]) {
        
        return contentList;
    }
    
    
    
    /// @notice Get list of the newest contents in the catalog
    /// @param _number the number of newest contents requested
    /// @return the list of the _number titles of the newest contents
    /// @dev the casting is needed since using uint instead of int while iterating backward faces the underflow problem when i = 0 and the loop performs i--
    function getNewContentList(uint _number) external view returns(bytes32[]) {
        
        // Keep the minimum between _number and the length of the catalog
        int len = int(contentList.length);
        int min = int(_number);

        if(min > len)
            min = len;
        
        bytes32[] memory _list = new bytes32[](uint(min));

        for(int i = len - 1; i >= len - min; i--) 
            _list[uint(len - 1 - i)] = contentList[uint(i)];
        
        return _list;
    }
    
    
    /// @notice Get the newest content of a given genre
    /// @param _genre the genre of the requested content
    /// @return the title of the newest content
    function getLatestByGenre(bytes32 _genre) external view returns(bytes32) {

        return latestGenreMap[_genre];
    }



    /// @notice Get the newest content of a given author
    /// @param _author the author of the requested content
    /// @return the title of the newest content
    function getLatestByAuthor(bytes32 _author) external view returns(bytes32) {
        
        return latestAuthorMap[_author];
    }

    
    /// @notice Get the most popular content of a given genre
    /// @param _genre the genre of the requested content
    /// @return the title of the most popular content
    function getMostPopularByGenre(bytes32 _genre) external view returns(bytes32){
        
        return mostPopularGenreMap[_genre];
    }
    
    
    
    /// @notice Get the most popular content of a given author
    /// @param _author the author of the requested content
    /// @return the title of the most popular content
    function getMostPopularByAuthor(bytes32 _author) external view returns(bytes32){
        
        return mostPopularAuthorMap[_author];
    }


    /// @notice Get the most rated content of a given category
    /// @param _category the category of the requested content
    /// @return the title of the most popular content
    function getMostRated(uint8 _category) external view validCategory(_category) 
                                                            returns(bytes32) {

        return mostRatedContent[_category];
    }


    /// @notice Get the most rated content of a given category of a given author
    /// @param _category the category of the requested content
    /// @param _author the author of the requested content
    /// @return the title of the most popular content
    function getMostRatedByAuthor(bytes32 _author, uint8 _category) external view 
                                                                    validCategory(_category) 
                                                                    returns(bytes32) {
        
        return mostRatedByAuthor[_author][_category];
    }    


    /// @notice Get the most rated content of a given category
    /// @param _category the category of the requested content
    /// @param _genre the genre of the requested content
    /// @return the title of the most popular content
    function getMostRatedByGenre(bytes32 _genre, uint8 _category) external view 
                                                                validCategory(_category)    
                                                                returns(bytes32) {
        
        return mostRatedByGenre[_genre][_category];
    }    


        ///////////////////////////////////
        ///         Self Destruct       ///
        ///////////////////////////////////


    /// @notice Destruct the catalog, pay the authors proportionally to the views: if any content was consumed, pay every content equally
    function destructCOBrA() external isCEO {
        
            
        uint i = 0;
        uint _factor = totalViews;
        uint _totalBalance = address(this).balance;
        bytes32 _content = 0x0;
        
        if(_factor == 0) // No content was viewed
            _factor = contentList.length;

        if(_factor > 0) {
            // At least  a view or a content
            
            if(totalViews > 0){
                // Divide the balance proportionally to the views
                for(i=0; i<contentList.length; i++) {
                    

                    _content = contentList[i];
                    payAndDestroy(_content, contentMap[_content].views(), _factor, _totalBalance);
                }
            }

            else {
                // Divide the balance equally for each content
                for(i=0; i<contentList.length; i++){
                    
                    _content = contentList[i];
                    payAndDestroy(_content, 1, _factor, _totalBalance);
                }
            }
        }
        
        emit COBrAShutDown();
        selfdestruct(COBrA_CEO_Address);
    }

    function payAndDestroy(bytes32 _content, uint _multiplier, uint _factor, uint _totalBalance) private {

        finalPayment(_content, _multiplier, _factor, _totalBalance);
        contentMap[_content].destruct();
    }
    


        ///////////////////////////////////
        ///            Helpers          ///
        ///////////////////////////////////


    /// @notice Send the payment to authors during the last payment cycle
    /// @param _content the current content
    /// @param _multiplier the multiplier for the amount computation
    /// @param _factor the factor for the amount computation
    function finalPayment(bytes32 _content, uint _multiplier, uint _factor, uint _balance) private {
        
        uint _amount = (_multiplier * _balance) / _factor;
        address _author = contentMap[_content].authorAddress();
        _author.transfer(_amount);
        emit AuthorPayed(contentMap[_content].author(), _amount);
    }


    /// @notice Compute the raward for an author
    /// @param _content The content viewed
    /// @return The amount of wei for the author
    function computeReward(bytes32 _content) private view returns(uint) {

        uint rate = contentMap[_content].getRateSum();
        uint max = numCategories * maxRate;
        return (contentMap[_content].price() * rate) / max;
    }


    /// @notice Check whether to update the best content of a given category
    /// @param _content The viewed content
    /// @param _category A content's category
    function updateCategory(bytes32 _content, uint8 _category) private {

        // Most rated in general
        bytes32 _bestRated = mostRatedContent[_category];
        uint _popularRate = 0;

        if(_bestRated == 0x0) {
            // First rating
            mostRatedContent[_category] = _content;
        }
        else {
            
            _popularRate = contentMap[_bestRated].getRate(_category);
            
            if(contentMap[_content].getRate(_category) > _popularRate)
                mostRatedContent[_category] = _content;
        }
        
    
        // Update most rated by author
        updateMostRatedByAuthor(_content, _category);

        // Update most rated by genre
        updateMostRatedByGenre(_content, _category);        
    }


    ////
    // MOST  == The most rated for a category
    ////
    /// @notice Check whether to update the best content of an author of a given category
    /// @param _content The viewed content
    /// @param _category A content's category
    function updateMostRatedByAuthor(bytes32 _content, uint8 _category) private  {

        bytes32 _author = contentMap[_content].author();
        bytes32 _bestRatedByAuthor = mostRatedByAuthor[_author][_category];
        uint _popularRate = 0;

        if(_bestRatedByAuthor == 0x0) {
            // First rating to a content to that genre
            mostRatedByAuthor[_author][_category] = _content;
        }
        else {

            _popularRate = contentMap[_bestRatedByAuthor].getRate(_category);
            
            if(contentMap[_content].getRate(_category) > _popularRate) {
                
                mostRatedByAuthor[_author][_category] = _content;
            }
        }        
    }


    /// @notice Check whether to update the best content of a genre of a given category
    /// @param _content The viewed content
    /// @param _category A content's category
    function updateMostRatedByGenre(bytes32 _content, uint8 _category) private  {

        bytes32 _genre = contentMap[_content].getGenre();
        bytes32 _bestRatedByGenre = mostRatedByGenre[_genre][_category];
        uint _popularRate = 0;

        if(_bestRatedByGenre == 0x0) {
            // First rating to a content to that genre
            mostRatedByGenre[_genre][_category] = _content;
        }
        else {

            _popularRate = contentMap[_bestRatedByGenre].getRate(_category);
            
            if(contentMap[_content].getRate(_category) > _popularRate)
                mostRatedByGenre[_genre][_category] = _content;
        }        
    }


    ////
    // BEST == The most rated in avg
    ////
    /// @notice Check whether to update the best content of an author (i.e. the the highest category's avg rating)
    /// @param _content The viewed content
    /// @param _contentSum The sum of the content's ratings
    function updateBestRatedByAuthor(bytes32 _content, uint _contentSum) private {

        bytes32 _author = contentMap[_content].author();
        uint8 avgPos = uint8(Categories.Average);

        if(mostRatedByAuthor[_author][avgPos] == 0x0)
            mostRatedByAuthor[_author][avgPos] = _content;
        else {

            bytes32 _bestByAuthor = mostRatedByAuthor[_author][avgPos];

            if(_contentSum > contentMap[_bestByAuthor].getRateSum())
                mostRatedByAuthor[_author][avgPos] = _content;
        }
    }


    /// @notice Check whether to update the best content of a genre (i.e. the the highest category's avg rating)
    /// @param _content The viewed content
    /// @param _contentSum The sum of the content's ratings
    function updateBestRatedByGenre(bytes32 _content, uint _contentSum) private {

        bytes32 _genre = contentMap[_content].getGenre();
        uint8 avgPos = uint8(Categories.Average);
        
        if(mostRatedByGenre[_genre][avgPos] == 0x0)
            mostRatedByGenre[_genre][avgPos] = _content;
        else {

            bytes32 _bestByGenre = mostRatedByGenre[_genre][avgPos];

            if(_contentSum > contentMap[_bestByGenre].getRateSum())
                mostRatedByGenre[_genre][avgPos] = _content;
        }
    }


    /// @notice Check whether to update the most popular content of an author
    /// @param _content The viewed content
    function updateMostPopularByAuthor(bytes32 _content) private {

        bytes32 _author = contentMap[_content].author();                    // author name
        bytes32 _currentPopularByAuthor = mostPopularAuthorMap[_author];    // pop content
        uint _popularViews = 0;

        if(_currentPopularByAuthor == 0x0){
            // First access to a content to that author
            mostPopularAuthorMap[_author] = _content;
            emit NewPopularByAuthor(_author, _content);
        }
        else {
            _popularViews = contentMap[_currentPopularByAuthor].views();    // pop views
    
            if(contentMap[_content].views() > _popularViews) {
                
                mostPopularAuthorMap[_author] = _content;
                emit NewPopularByAuthor(_author, _content);
            }
        }   

    }


    /// @notice Check whether to update the most popular content of a genre
    /// @param _content The viewed content
    function updateMostPopularByGenre(bytes32 _content) private {

        bytes32 _genre = contentMap[_content].getGenre();               // genre name
        bytes32 _currentPopularByGenre = mostPopularGenreMap[_genre];   // pop content
        uint _popularViews = 0;

        if(_currentPopularByGenre == 0x0){
            // First access to a content of that genre
            mostPopularGenreMap[_genre] = _content;            
            emit NewPopularByGenre(_genre, _content);
        }
        else {
            _popularViews = contentMap[_currentPopularByGenre].views(); // pop views
    
            if(contentMap[_content].views() > _popularViews) {
                
                mostPopularGenreMap[_genre] = _content;
                emit NewPopularByGenre(_genre, _content);
            }
        }
    }
}