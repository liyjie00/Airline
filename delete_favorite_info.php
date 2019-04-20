<?php
    session_start();
    $favorite_id = $_GET["favorite_id"];

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
	$sql = "DELETE FROM favorite WHERE favorite_id='$favorite_id'";
	mysqli_query($conn, $sql);
	mysqli_close($conn);
?>