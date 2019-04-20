<?php
    session_start();

    $email = $_POST["email"];
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
        echo "1";
        exit;
    }

    $account_id = $_SESSION['account_id'];

    $sql = "Update account set email = '$email' where account_id=$account_id";
    
    $result = mysqli_query($conn, $sql);
    echo "0";
?>