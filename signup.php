
<?php
    session_start();

    if ($_SERVER["REQUEST_METHOD"] == "POST"){
        $error = 0;

        $username = $_POST["signup_username"];
        $password = $_POST["signup_pwd"];
        $email = $_POST["signup_email"];

        $user = 'root';
        $password_mql = 'WQjb1234!';
        $db = 'test';
        $host = '149.28.213.37';
        $port = 3306;

        $conn = mysqli_connect(
           $host, 
           $user, 
           $password_mql, 
           $db
        );

        if (!$conn){
            $error = array('res'=>1);
            echo json_encode($error);
            exit();
        }

        $sql = "SELECT * FROM account where username = '$username'";
        $result = mysqli_query($conn, $sql);

        if ($result->num_rows !== 0) {
            $error = array('res'=>2);
            echo json_encode($error);
            exit();
        }
      
        $sql = "SELECT * FROM account where email = '$email'";
        $result = mysqli_query($conn, $sql);
        if ($result->num_rows !== 0) {
            $error = array('res'=>3);
            echo json_encode($error);
            exit();
        }

        $sql = "insert into account(username, password, email, user_type) values ('$username', '$password', '$email', 0)";
        $result = mysqli_query($conn, $sql);
        $id = mysqli_insert_id($conn);
//        $error = 0;
//        echo $error;
        $error = array('res'=>0, 'name'=>$username, 'type'=>0);
        echo json_encode($error);

        $_SESSION["account_username"] = $username;
        $_SESSION["account_email"] = $email;
        $_SESSION["account_id"] = $id;

        
        exit();
    }
?>

<form id="signup_form">
    <div class="signup_header">
        <P style="padding-top:5%; font-size: 28px; color:white">Sign up</P>
        <hr style="background-color: white; height: 2px;margin:5px">

        <p style="color:white">Be a part of our community!</p>
    </div>
    <div class="signup_body">
        <div id = "error" style="color:red"></div>
        <input type="text" id = "username" name="signup_username" placeholder="Username" required><br>
        <input type="password" id = "password" name="signup_pwd" placeholder="Password"><br>
        <input type="password" id = "password_c" name="signup_c_pwd" placeholder="Confirm password"><br>
        <input type="email" id = "email" name="signup_email" placeholder="E-mail address"><br>
        <input type="text" id = "phone" name="signup_phone" placeholder="Phone number"><br>
        <br>
        <a id="go2login" style="cursor: pointer;color: white;">Already have an account</a>

    </div>

    <button class="signup_footer" type="button" id = 'register'>
        <span class="glyphicon glyphicon-pencil"></span>
        SignUp Now!
    </button>
</form> 

<script type="text/javascript">
    $(document).ready(function() {        
        $('#register').on("click", function() { 
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
                    if (0 == response.res) {
                        location.href = "index.php";
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