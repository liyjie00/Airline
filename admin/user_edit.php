<?php
	session_start();

	$id = $_POST["id"];
	$email = $_POST["email"];
	$username = $_POST["username"];
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
		echo "1";
		exit();
	}

	$sql = "SELECT * FROM account where email = '$email' and account_id <> $id";
	
    $result = mysqli_query($conn, $sql);
    if ($result->num_rows !== 0) {
        echo "2";
        exit();
    }

	$sql = "UPDATE account set email='$email', user_type='$user_type' where account_id=$id";
	$result = mysqli_query($conn, $sql);
	if($result == FALSE) {
		echo "3";
		exit();
	}
	echo "0";
		
?>