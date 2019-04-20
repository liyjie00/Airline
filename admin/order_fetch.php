<?php
	session_start();

	$keywords = $_GET["keywords"];

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

    $account_id = $_SESSION['account_id'];


    $sql = "SELECT account.username, orderr.order_id,orderr.order_date, order_flight.flight_date, 
                       flight_leg.depart_time, flight_leg.depart_code, flight_leg.arrive_code, payment.amount 
                       FROM orderr 
                       left join order_flight on orderr.order_id = order_flight.order_id 
                       left join flight_leg on order_flight.flight_id = flight_leg.flight_id 
                       left join payment on payment.payment_id = orderr.payment_id 
                       left join account on orderr.account_id = account.account_id";

	if ($keywords != "") {
		$sql .= " where account.username = '$keywords'";
	}

	$sql .= " order by orderr.order_id";
	
	$result = mysqli_query($conn, $sql);

	$rows = array();
	while($r = mysqli_fetch_assoc($result)) {
	  	$rows[] = $r;
	}
	header('Content-Type: application/json');
	echo json_encode($rows);	
?>