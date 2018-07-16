    ////////////////////////////////////////////
    ////               Helpers              ////
    ////////////////////////////////////////////


/**
 * Add a user notification to the notification sidebar, shrinking the address to reduce length
 * @param {*} address the address
 * @param {*} middleText some text to show
 * @param {*} content the content
 */
function addUserNotification(address, middleText, content) {

    // Whenever the event is triggered
    const l = address.length;
    const stubAddr = address.charAt(0) + address.charAt(1) + address.charAt(2) + address.charAt(3) +
                        "..." + 
                        address.charAt(l-1) + address.charAt(l-2) + address.charAt(l-3) + address.charAt(l-4);

    appendNotification(stubAddr, middleText, content);
}

/**
 * Add a content notification to the notification sidebar
 * @param {*} from the author
 * @param {*} middleText some text to show
 * @param {*} content the content
 */
function appendNotification(from, middleText, content) {

    const s = from + " " + middleText + " " + content;
    var contentTemplate ="<tr><td>" + s + "</td></tr>";
    $('#notificationList').append(contentTemplate);
}

/**
 * Generate HTML code to display rating stars
 */
function loadRating() {

    const s = '<label class="pull-left">Quality:</label>' +
                '<div id="qualityRate" class="pull-right"></div>' +
                '</br></br>' +
                '<label class="pull-left">Price Fairness:</label>'+
                '<div id="priceRate" class="pull-right"></div>'+
                '</br></br>' +
                '<label class="pull-left">Rewatchable:</label>'+
                '<div id="rewatchRate" class="pull-right"></div>'+
                '</br></br>' +
                '<label class="pull-left">Family Friendly:</label>'+
                '<div id="familyRate" class="pull-right"></div>'+
                '</br>';
    return s;
}

/**
 * Create a line of non interactive stars to diplay a rating 
 * @param {*} rate the rate to display
 */
function createRateOfContent(rate) {

    let s = "";
    let i=1;
    
    // Generate 'rate' number of checked stars
    for(; i<=rate; i++) 
        s += createStar(i, false, 'checked');

    // Generate 10-'rate' number of unchecked stars
    for(; i<=10; i++) 
        s += createStar(i, false, '');

    return s;
}

/**
 * Create a line of interactive stars to let the user to rate a content's category
 * @param {*} category the category to rate
 */
function createRating(category) {

    let s = "";
    s += createStar(1, true, 'checked', category);

    for(var i=2; i<=10; i++) 
        s += createStar(i, true, '', category);

    return s;
}

/**
 * Create HTML code for a star
 * @param {*} pos position of the star
 * @param {*} interactible if the star is interactive, i.e. it can be toggled
 * @param {*} checked if the star is checked
 * @param {*} category the star's category
 */
function createStar(pos, interactible, checked, category) {

    const id = 'star' + category + '' + pos; 

    if(interactible)
        return '<span class="fa fa-star ' + checked + '" id="' + id + '" onclick="addStars(this,'+pos+', \''+category+'\')" style="cursor: pointer"></span>';
    else
        return '<span class="fa fa-star ' + checked + '"></span>';
}

/**
 * Rate a content (check the stars)
 * @param {*} ths This
 * @param {*} sno The number of stars to check
 * @param {*} category The category
 */
function addStars(ths, sno, category) {

    // The category helps to get the stars by id

    for (var i=1;i<=10;i++) {
        var cur = $('#star'+category+''+i);
        cur.removeClass("checked");
    }

    for (var i=1;i<=sno;i++) {
        var cur = $('#star'+category+''+i);
        if(cur.hasClass("fa fa-star")) {
            cur.addClass("fa fa-star checked");
        }
    }
}

/**
 * Get the rate of a content's category after user's input
 * @param {*} category the category
 */
function getCheckedStars(category) {

    // The category helps to get the stars by id
    var count = 0;

    for(var i=1; i<=10; i++) {

        var cur = $('#star'+category+''+i);
        if(cur.hasClass("checked"))  count++;
    }

    return count;
}