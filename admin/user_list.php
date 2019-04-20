<?php
	session_start();

	$keywords = $_GET["keywords"];
	$deleted = $_GET["deleted"];

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
	if ($deleted == '0') {
		$sql = "SELECT * FROM account where deleted = 0";
	} else {
		$sql = "SELECT * FROM account where deleted = 1";
	}
	

	if ($keywords != "") {
		$sql .= " and username like '$keywords'";
	}
	$result = mysqli_query($conn, $sql);

	$rows = array();
	while($r = mysqli_fetch_assoc($result)) {
	  	$rows[] = $r;
	}
	header('Content-Type: application/json');
	echo json_encode($rows);	
?>