<?php
    session_start();

    $old_password = $_POST["old_password"];
    $new_password = $_POST["new_password"];

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

    $sql = "select * from account where account_id=$account_id";

    
    $result = mysqli_query($conn, $sql);
    $r = mysqli_fetch_assoc($result);

    if ($r["password"] != $old_password) {
        echo "2";
        exit;
    }

    $sql = "update account set password='$new_password' where account_id=$account_id";
    $result = mysqli_query($conn, $sql);
    if ($result == false) {
        echo "3";
        exit;
    }
    echo "0";
?>