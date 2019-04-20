<?php
    session_start();

    if ($_SERVER["REQUEST_METHOD"] == "POST"){
        $error = 0;

        $username = $_POST["login_username"];
        $password = $_POST["login_pwd"];
        

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
            $error = array('res'=>2);
            echo json_encode($error);
            exit();
        }

        $sql = "SELECT * FROM account where username = '$username' and password = '$password' and deleted = 0";
        $result = mysqli_query($conn, $sql);

        if ($result->num_rows === 0) {
            $error = array('res'=>1);
            echo json_encode($error);
            exit();
        }
        $row = mysqli_fetch_assoc($result);
        

        $_SESSION["account_username"] = $row["username"];
        $_SESSION["account_id"] = $row["account_id"];
        $_SESSION['user_type'] = $row['user_type'];

//        echo $_SESSION["account_username"];
        $error = array('res'=>0, 'name'=>$row["username"], 'type'=>$row["user_type"]);
        echo json_encode($error);
        exit();
    }
?>

<form id="login_form" action="">
    <div class="login_header">
        <P style="padding-top:5%; font-size: 28px; color:white">Log in</P>
        <hr style="background-color: white; height: 2px;margin:5px">

        <p style="color:white">Welcome back to our community!</p>
    </div>
    <div class="login_body">
        <span id = "error_login" style="color:red"></span><br>
        <input type="text" name="login_username" placeholder="Username/E-mail address"><br>
        <input type="password" name="login_pwd" placeholder="Password"><br>
        <br>
<!--        <a href="">Forgot your password?</a><br>-->
        <a id="go2signup" style="cursor: pointer;color: white;">Do not have an account?</a>
    </div>
    <button class="login_footer" type="button" id="login">
        <span class="glyphicon glyphicon-lock"></span>
        Login Now!
    </button>
</form>

<script type="text/javascript">
    $(document).ready(function() {        
        $('#login').on("click", function() { 
            var data = $('#login_form').serialize();
            $.ajax({
                type : 'post',
                url : 'login.php',
                headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
                data : data,
                dataType: 'json',
                success: function(response) {
                    if (0 == response.res) {
                        location.href = "index.php";
                    } else if (1 == response.res) {
                        $('#error_login').html("Username or password is error");
                    } else if (2 == response.res) {
                        $('#error_login').html("Can not connect to database");
                    }
                },
                error: function() {
                    $('#error').html("System error");
                }
            });
        });
    });
        
</script>