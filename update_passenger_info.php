<?php
	$p_id = $_GET["p_id"];
	$is_adult = $_GET["is_adult"];
	$fname = $_GET["fname"];
	$lname = $_GET["lname"];
	$gender = $_GET["gender"];
	$nationality = $_GET["nationality"];
	$id_type = $_GET["id_type"];
	$phone = $_GET["phone"];
	$id_number = $_GET["id_number"];
	$dob = $_GET["dob"];
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
	$sql = "UPDATE passenger SET dob='$dob', fname='$fname', lname='$lname', gender='$gender', nationality='$nationality', id_type='$id_type', id_number='$id_number',phone='$phone', is_adult='$is_adult' WHERE p_id='$p_id'";
	// $sql = "INSERT INTO passenger (p_id, dob, fname, lname, gender, nationality, id_type, id_number, phone, is_adult) VALUES ('$p_id', '$dob', '$fname', '$lname', '$gender', '$nationality', '$id_type', '$id_number', '$phone')";
	mysqli_query($conn, $sql);
	mysqli_close($conn);
?>