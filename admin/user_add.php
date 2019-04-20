<?php
    session_start();

    if ($_SERVER["REQUEST_METHOD"] == "POST"){
        $error = 0;

        $username = $_POST["signup_username"];
        $password = $_POST["signup_pwd"];
        $email = $_POST["signup_email"];
        $user_type = $_POST["user_type"];
        

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
            $error = 1;
            echo $error;
            exit();
        }

        $sql = "SELECT * FROM account where username = '$username'";
        $result = mysqli_query($conn, $sql);

        if ($result->num_rows !== 0) {
            $error = 2;
            echo $error;
            exit();
        }
        

        $sql = "SELECT * FROM account where email = '$email'";
        $result = mysqli_query($conn, $sql);
        if ($result->num_rows !== 0) {
            $error = 3;
            echo $error;
            exit();
        }

        $sql = "insert into account(username, password, email, user_type) values ('$username', '$password', '$email', user_type)";
        $result = mysqli_query($conn, $sql);
        $id = mysqli_insert_id($conn);
        $error = 0;
        echo $error;
        exit();
    }
?>