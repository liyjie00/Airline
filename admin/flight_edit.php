<?php
	session_start();

	$id = $_POST["flight_id"];
	$date = $_POST["date"];
	$econ_seat = $_POST["econ_seat"];
	$bus_seat = $_POST["bus_seat"];
	$discount_rate = $_POST["discount_rate"];
	
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

	$sql = "UPDATE flight set num_econ_seat=$econ_seat, num_bus_seat=$bus_seat, discount_rate=$discount_rate where flight_id=$id and date='$date'";
	
	$result = mysqli_query($conn, $sql);
	if($result == FALSE) {
		echo "2";
		exit();
	}
	echo "0";
?>