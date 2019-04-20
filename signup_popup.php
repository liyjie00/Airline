<?php
    session_start();
?>

<div id="signup_modal" class="modal">
    <div clas="close_icon">
    <p class="close" title="Close Modal">&times;</p>
    </div>

    <form class="modal-content">
        <div class="container popup_container">
            <h1>Sign Up</h1>
            <p>Please fill in this form to create an account.</p>
            <hr>
            <input type="text" id = "username" name="signup_username" placeholder="Username" required><br>
            <input type="password" id = "password" name="signup_pwd" placeholder="Password"><br>
            <input type="password" id = "password_c" name="signup_c_pwd" placeholder="Confirm password"><br>
            <input type="email" id = "email" name="signup_email" placeholder="E-mail address"><br>
            <input type="text" id = "phone" name="signup_phone" placeholder="Phone number"><br>

            <p>By creating an account you agree to our <a href="#" style="color:dodgerblue">Terms & Privacy</a>.</p>
            <a id="go2login_popup" style="cursor: pointer;">Already have an account</a>

            <div class="">
                <button type="button" class="popup_btn cancelbtn">Cancel</button>
                <button type="button" class="popup_btn signupbtn">Sign Up</button>
            </div>
        </div>
    </form>

</div>


<script type="text/javascript">
    $(document).ready(function() {
        $('.signupbtn').on("click", function() {
            var username = $("#username").val();
            var password = $("#password").val();
            var email = $("#email").val();
            var password_c = $("#password_c").val();

            var username_preg = /^[a-zA-Z0-9]{1,31}$/;
            if (username == "") {
                $('#username').focus();
                $('#error').html("Please input username");
                return;
            }
            if (!username_preg.test(username)) {
                $('#username').focus();
                $('#error').html("Use letters and numbers");
            }

            var password_preg = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[\s\S]{8,16}$/;
            if (password == "") {
                $('#password').focus();
                $('#error').html("Please input password");
                return;
            }
            if (!password_preg.test(password)) {
                $('#password').focus();
                $('#error').html("Use at least one lowercase letter, one uppercase letter, one numeral, and eight characters");
                return;
            }

            if (password != password_c) {
                $('#password_c').focus();
                $('#error').html("The two passwords are not the same");
                return;
            }

            var email_preg = /^(\w{1,25})@(\w{1,16})(\.(\w{1,4})){1,3}$/;
            if (!email_preg.test(email)) {
                $('#email').focus();
                $('#error').html("Please input valid email");
                return;
            }
            alert("in");
            $.ajax({
                type : 'post',
                url : 'signup.php',
                headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
                data :{
                    signup_username : username,
                    signup_pwd : password,
                    signup_email : email
                },
                dataType: 'json',
                success: function(response) {
                    console.log("response code: " + response.res);
                    if (0 == response.res) {
                        closeWindow();
                        hasLogin(response.name, response.type);
                        location.reload();

                        // location.href = "index.php";
                    } else if (1 == response.res) {
                        $('#error').html("Server error");
                    }else if (2 == response.res) {
                        $('#username').focus();
                        $('#error').html("The username has been used");
                    } else if (3 == response.res) {
                        $('#email').focus();
                        $('#error').html("The email has been used");
                    }
                },
                error: function() {

                }
            });
        });
    });

</script>