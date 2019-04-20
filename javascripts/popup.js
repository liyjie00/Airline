$(document).ready(function(){
    // Get the modal
    var sign_modal = $('#signup_modal');
    var log_modal = $('#login_modal');

    $('.cancelbtn').click(function (){
        sign_modal.removeClass('show');
        log_modal.removeClass('show');
        $('#notify_add_fav_modal').removeClass('show');

    });

    $('.close').on('click', function(e){
        sign_modal.removeClass('show');
        log_modal.removeClass('show');
        $('#notify_add_fav_modal').removeClass('show');
    });

    $('#go2signup_popup').click(function () {
        // alert("switch to haha");
        call_signup_popup();
    });

    $('#go2login_popup').click(function () {
        // alert("switch to haha");
        call_login_popup();
    });

});


