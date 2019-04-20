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

	$sql = "DELETE FROM order_passenger where order_id=$id";
	$result = mysqli_query($conn, $sql);
	if($result == FALSE) {
		echo "3";
		exit();
	}

	$sql = "DELETE FROM order_flight where order_id=$id";
	$result = mysqli_query($conn, $sql);
	if($result == FALSE) {
		echo "4";
		exit();
	}

	$sql = "DELETE FROM orderr where order_id=$id";
	$result = mysqli_query($conn, $sql);
	if($result == FALSE) {
		echo "4";
		exit();
	}

	echo "0";
		
?>