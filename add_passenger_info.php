<?php
    session_start();
	$is_adult = $_GET["is_adult"];
	$fname = $_GET["fname"];
	$lname = $_GET["lname"];
	$gender = $_GET["gender"];
	$nationality = $_GET["nationality"];
	$id_type = $_GET["id_type"];
	$phone = $_GET["phone"];
	$id_number = $_GET["id_number"];
	$dob = $_GET["dob"];

	$account_id = $_SESSION["account_id"];

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
	$sql = "INSERT INTO passenger (dob, fname, lname, gender, nationality, id_type, id_number, phone, is_adult) VALUES ('$dob', '$fname', '$lname', '$gender', '$nationality', '$id_type', '$id_number', '$phone', '$is_adult')";
	mysqli_query($conn, $sql);
	$p_id = mysqli_insert_id($conn);
	$sql = "INSERT INTO account_passenger (account_id, p_id) VALUES ('$account_id', '$p_id')";
	mysqli_query($conn, $sql);
	$sql = "SELECT * FROM passenger WHERE passenger.p_id = '$p_id'";
	$result = mysqli_query($conn, $sql);
	$row = mysqli_fetch_assoc($result);
	echo json_encode($row);
	mysqli_close($conn);
?>