function hasLogin(username, type){
    // alert("type: " + type);

    if (1 == type){
        $('.navbar-right').html("<li><a>Welcome, " + username +"</a></li> <li class='dropdown' id='usr_info'><a href='#' class='dropdown-toggle' data-toggle='dropdown'>My info <b class='caret'></b></a><ul class='dropdown-menu'><li><a href='profile.php'>My Profile</a></li><li><a href='order_list.php'>My Orders</a></li><li><a href='favorites.php'>My Favorites</a></li><li><a href='./admin/admin_index.php'>My Admin</a></li><li role='separator' class='divider'></li><li><a href='logout.php'>Log out</a></li></ul></li>");
    } else {
        $('.navbar-right').html("<li><a>Welcome, " + username +"</a></li> <li class='dropdown' id='usr_info'><a href='#' class='dropdown-toggle' data-toggle='dropdown'>My info <b class='caret'></b></a><ul class='dropdown-menu'><li><a href='profile.php'>My Profile</a></li><li><a href='order_list.php'>My Orders</a></li><li><a href='favorites.php'>My Favorites</a></li><li role='separator' class='divider'></li><li><a href='logout.php'>Log out</a></li></ul></li>");
    }
}


function showIndexLoginSignup(){
    $('.navbar-right').html("<li><a id='login_btn'>Log in </a></li><li><a id='signup_btn'>Sign up </a></li>");     
}

function showLoginSignup(){
    // alert("haha");
    $('.navbar-right').append("<li><a onclick='call_login_popup()' id='s_login_btn'>Log in </a></li><li><a  onclick='call_signup_popup()' id='s_signup_btn'>Sign up </a></li>");
}

function call_login_popup(){
    // alert("pop");
    var sign_modal = $('#signup_modal');
    var log_modal = $('#login_modal');
    log_modal.addClass('show');
    sign_modal.removeClass('show');
}


function call_signup_popup(){
    // alert("pop");
    var sign_modal = $('#signup_modal');
    var log_modal = $('#login_modal');
    sign_modal.addClass('show');
    log_modal.removeClass('show');
}