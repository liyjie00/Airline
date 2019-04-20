<?php
	session_start();
    $oneRound = $_GET["oneRound"];
    $economyBusiness = $_GET["economyBusiness"];
    $p_id_list = $_GET["p_id"];
    $money = $_GET["money"];
    $insurance_type = $_GET["insurance_type"];
    if($oneRound == "one") {
        $departFlight_id = $_GET["departFlight_id"];
        $departDate = $_GET["departDate"];
    } else {
        $departFlight_id = $_GET["departFlight_id"];
        $departDate = $_GET["departDate"];
        $returnFlight_id = $_GET["returnFlight_id"];
        $returnDate = $_GET["returnDate"];
    }
    $pay_type = $_GET["pay_type"];
    $pay_number = $_GET["pay_number"];
    // $account_id = $_SESSION["account_id"];
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
    $current_date = date("Y-m-d H:i:s");
    if ($oneRound == "round") {
        $money = $money / 2;
    }
    $sql = "INSERT INTO payment (pay_date, pay_type, pay_acc_num, amount) VALUES ('$current_date', '$pay_type', '$pay_number', '$money')";
    mysqli_query($conn, $sql);
    $payment_id = mysqli_insert_id($conn);
    $sql = "INSERT INTO orderr (order_date, payment_id, account_id, insurance_type) VALUES ('$current_date', '$payment_id', '$account_id', '$insurance_type')";
    mysqli_query($conn, $sql);
    $order_id = mysqli_insert_id($conn);
    $p_id_list = explode(",", $p_id_list);
    foreach($p_id_list as $p_id) {
    	$sql = "INSERT INTO order_passenger (order_id, p_id) VALUES ('$order_id', '$p_id')";
    	mysqli_query($conn, $sql);
    }
    $sql = "INSERT INTO order_flight (order_id, flight_id, flight_date, pass_type) VALUES ('$order_id', '$departFlight_id', '$departDate', '$economyBusiness')";
    mysqli_query($conn, $sql);
    if($oneRound == "round") {
    	$sql = "INSERT INTO order_flight (order_id, flight_id, flight_date, pass_type) VALUES ('$order_id', '$returnFlight_id', '$returnDate', '$economyBusiness')";
    	mysqli_query($conn, $sql);
    }
    // change residual seat number;
    if($economyBusiness == "economy") {
        $sql = "SELECT num_econ_seat FROM flight WHERE flight.flight_id = '$departFlight_id' AND flight.date = '$departDate'";
        $result = mysqli_query($conn, $sql);
        $row = mysqli_fetch_array($result);
        $num_econ_seat = (int)$row["num_econ_seat"] - 1;
        $sql = "UPDATE flight SET num_econ_seat = '$num_econ_seat' WHERE flight.flight_id = '$departFlight_id' AND flight.date = '$departDate'";
        mysqli_query($conn, $sql);
    } else {
        $sql = "SELECT num_bus_seat FROM flight WHERE flight.flight_id = '$departFlight_id' AND flight.date = '$departDate'";
        $result = mysqli_query($conn, $sql);
        $row = mysqli_fetch_array($result);
        $num_bus_seat = (int)$row["num_bus_seat"] - 1;
        $sql = "UPDATE flight SET num_bus_seat = '$num_bus_seat' WHERE flight.flight_id = '$departFlight_id' AND flight.date = '$departDate'";
        mysqli_query($conn, $sql);
    }
    if($oneRound == "round") {
        if($economyBusiness == "economy") {
            $sql = "SELECT num_econ_seat FROM flight WHERE flight.flight_id = '$returnFlight_id' AND flight.date = '$returnDate'";
            $result = mysqli_query($conn, $sql);
            $row = mysqli_fetch_array($result);
            $num_econ_seat = (int)$row["num_econ_seat"] - 1;
            $sql = "UPDATE flight SET num_econ_seat = '$num_econ_seat' WHERE flight.flight_id = '$returnFlight_id' AND flight.date = '$returnDate'";
            mysqli_query($conn, $sql);
        } else {
            $sql = "SELECT num_bus_seat FROM flight WHERE flight.flight_id = '$returnFlight_id' AND flight.date = '$returnDate'";
            $result = mysqli_query($conn, $sql);
            $row = mysqli_fetch_array($result);
            $num_bus_seat = (int)$row["num_bus_seat"] - 1;
            $sql = "UPDATE flight SET num_bus_seat = '$num_bus_seat' WHERE flight.flight_id = '$returnFlight_id' AND flight.date = '$returnDate'";
            mysqli_query($conn, $sql);
        }
    }
    mysqli_close($conn);
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="">
    <meta name="author" content="">

    <title>Quzer Airline booking</title>

    <!-- Bootstrap Core CSS -->
    <!-- <link rel="stylesheet" href="https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css">
    <link rel="stylesheet" href="https://jquery.com/resources/demos/style.css"> -->

    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></script>
    <script src="https://code.jquery.com/jquery-1.12.4.js"></script>
    <script src="https://code.jquery.com/ui/1.12.1/jquery-ui.js"></script>
    

    <script src="javascripts/main.js"></script>
    <script src="javascripts/slide_box.js"></script>
    <script src="javascripts/dropdown_menu.js"></script>
    <script src="javascripts/search.js"></script>
    <script src="javascripts/popup.js"></script>
    <script src="javascripts/order.js"></script>

    <!-- Custom CSS -->
    <link href="stylesheets/half-slider.css" rel="stylesheet">

    <link rel="stylesheet" href="stylesheets/main.css">
    <link rel="stylesheet" href="stylesheets/nav.css">
    <link rel="stylesheet" href="stylesheets/box.css">
    <link rel="stylesheet" href="stylesheets/card.css">
    <link rel="stylesheet" href="stylesheets/dropdown.css">
    <link rel="stylesheet" href="stylesheets/autocomplete.css">
    <link rel="stylesheet" href="stylesheets/search.css">
    <link rel="stylesheet" href="stylesheets/popup.css">
    <link rel="stylesheet" href="stylesheets/order.css">
    <link rel="stylesheet" href="stylesheets/payment.css">

    <!-- HTML5 Shim and Respond.js IE8 support of HTML5 elements and media queries -->
    <!-- WARNING: Respond.js doesn't work if you view the page via file:// -->
    <!--[if lt IE 9]>
    <script src="https://oss.maxcdn.com/libs/html5shiv/3.7.0/html5shiv.js"></script>
    <script src="https://oss.maxcdn.com/libs/respond.js/1.4.2/respond.min.js"></script>
    <![endif]-->
</head>
<body>

    <!-- Navigation -->
    <?php include 'nav.php'; ?>

	


    <div class="container order">
    <div class="row content card">
        <div class="order_detail">
            <div id="hint" style="text-align: center">
                <h2>Successfully paid!</h2>
                <hr>
                <h5>Your order finished!</h5>
                <h5>Back to main page after 5 second! Thank you very much!</h5>
                <br>
                <hr>
                <button class="btn submit_payment_btn" style="width:150px; margin:0" type="button" onclick="window.location.href='index.php'">Back to Main Page</button>
            </div>
        </div>
    </div>
</div>
<!-- Footer -->
<footer class="py-5 bg-dark">
    <div class="container">
        <br>
        <p class="m-0 text-center text-white">CS6314 Class Project: Airline Reservation System</p>
        <p class="m-0 text-center text-white">Copyright &copy; QUZER 2018</p>
    </div>
    <hr>

    <!-- /.container -->
</footer>
</body>
</html>