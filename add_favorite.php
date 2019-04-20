<?php
    session_start();
    $depart_id = $_GET["depart_id"];
    $departDate = $_GET["departDate"];
    $oneRound = $_GET["oneRound"];
    $pass_type = $_GET["pass_type"];
    if($oneRound == "round") {
        $return_id = $_GET["return_id"];
        $returnDate = $_GET["returnDate"];
    }

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
    if($oneRound == "one") {
        $sql = "INSERT INTO favorite (account_id, depart_id, depart_date, oneround, pass_type) VALUES ('$account_id', '$depart_id', '$departDate', '$oneRound', '$pass_type')";
        mysqli_query($conn, $sql);
    } else {
        $sql = "INSERT INTO favorite (account_id, depart_id, depart_date, return_id, return_date, oneround, pass_type) VALUES ('$account_id', '$depart_id', '$departDate', '$return_id', '$returnDate', '$oneRound', '$pass_type')";
        mysqli_query($conn, $sql);
    }
	mysqli_close($conn);
?>