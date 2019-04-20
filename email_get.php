<?php
    session_start();

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
        echo "Connection failed!";
        exit;
    }
    $account_id = $_SESSION['account_id'];
    $sql = "Select email from account where account_id = $account_id";
    
    $result = mysqli_query($conn, $sql);
    $r = mysqli_fetch_assoc($result);
    header('Content-Type: application/json');
    echo json_encode($r);    
?>