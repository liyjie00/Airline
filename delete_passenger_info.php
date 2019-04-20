<?php
    session_start();
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
	$sql = "DELETE FROM passenger WHERE p_id='$p_id'";
	mysqli_query($conn, $sql);
	mysqli_close($conn);
?>