<?php
    session_start();
?>


<div id='login_modal' class="modal">
    <div clas="close_icon">
    <p class="close" title="Close Modal">&times;</p>
    </div>

    <form id="pop_login_form" class="modal-content">
        <div class="container popup_container">
            <h1>Log in</h1>
            <p>Please provide your information to log in.</p>
            <hr>
            <div id="pop_error_login" style="color:red"></div>
            <input type="text" placeholder="Username" name="login_username" required>
            <br>
            <input type="password" placeholder="Password" name="login_pwd" required>
            <br>
            <a id="go2signup_popup" style="cursor: pointer;">Do not have an account?</a>

            <div class="">
                <button type="button" class="popup_btn cancelbtn">Cancel</button>
                <button type="button" class="popup_btn loginbtn">Log in</button>
            </div>

        </div>
    </form>

</div>

<script type="text/javascript">
    $(document).ready(function() {
        $('.loginbtn').on("click", function() {

            var data = $('#pop_login_form').serialize();
            // alert(data);
            // event.preventDefault();
            $.ajax({
                type : 'post',
                url : 'login.php',
                headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
                data : data,
                dataType: 'json',
                success: function(response) {
                    console.log(response.name);

                    if (response.res == 0) {
                        closeWindow();
                        hasLogin(response.name, response.type);
                        location.reload();
                    } else if (1 == response.res) {
                        // alert("in");
                        $('#pop_error_login').html("Username or password is error");
                    } else if (2 == response) {
                        $('#pop_error_login').html("Can not connect to database");
                    }
                },
                error: function() {
                    $('#error').html("System error");
                }
            });
        });
    });

    function closeWindow(){
        var sign_modal = $('#signup_modal');
        var log_modal = $('#login_modal');
        sign_modal.removeClass('show');
        log_modal.removeClass('show');

    }

</script>