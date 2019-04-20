<?php
	session_start();

	$id = $_POST["id"];
	
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

	$sql = "update flight set deleted = 0 where flight_id=$id";
	$result = mysqli_query($conn, $sql);
	if($result == FALSE) {
		echo "3";
		exit();
	}

	echo "0";
		
?>