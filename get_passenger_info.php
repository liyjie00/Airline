<?php
	$p_id = $_GET["p_id"];
    $user = 'root';
    $password = 'WQjb1234!';
    $db = 'test';
    $host = '149.28.213.37';
    $port = 3306;
    $conn = mysqli_connect($host, $user, $password, $db, $port);
    if (!$conn){
		echo "Connection failed!";
		exit();
	}
	$sql = "SELECT * FROM passenger WHERE passenger.p_id = '$p_id'";
	$result = mysqli_query($conn, $sql);
	$row = mysqli_fetch_assoc($result);
	echo json_encode($row);
	mysqli_close($conn);
?>