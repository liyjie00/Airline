<?php
    session_start();

    $name = $_SESSION["account_username"];
    $usr_type = $_SESSION['user_type'];

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
    <!--    <script src="javascripts/popup.js"></script>-->
    <script src="javascripts/order.js"></script>
    <script src="javascripts/checkLogin.js"></script>
    <script src="javascripts/favorite.js"></script>

    <!-- Custom CSS -->
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
    <link rel="stylesheet" href="stylesheets/w3.css">

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

<div class="container" style="margin:50px 0px 10px 0px; padding-left: 0;">
    <div class="w3-sidebar w3-card-4" style="width:200px" id="mySidebar">
        <div class="w3-bar-block">
            <a class="w3-bar-item w3-button" href="profile.php" style="text-decoration: none">Profile</a>
            <a class="w3-bar-item w3-button" href="order_list.php" style="text-decoration: none">Order</a>
            <a class="w3-bar-item w3-button w3-blue" href="favorites.php" style="text-decoration: none">Favorite List</a>
            <a class="w3-bar-item w3-button" href="passenger.php" style="text-decoration: none">Passenger List</a>
        </div>
    </div>

    <div id="main" class="container" style="margin-left:210px">
<!--        <h5>Order list</h5>-->
        <p></p>
<!--        <hr>-->
        <div class='container order'>
            <ul class='query_result'>
                <?php
                    $sql = "SELECT * FROM favorite WHERE account_id = '$account_id'";
                    $result = mysqli_query($conn, $sql);
                    while($row = mysqli_fetch_array($result)) {
                        $favorite_id = $row["favorite_id"];
                        $oneRound = $row["oneround"];
                        if($oneRound == "one") {
                            $depart_id = $row["depart_id"];
                            $departDate = $row["depart_date"];
                            $pass_type = $row["pass_type"];
                            $sq1 = "SELECT * FROM flight, flight_leg, fare, airline, airplane WHERE flight.flight_id = flight_leg.flight_id AND flight_leg.flight_id = fare.flight_id AND flight_leg.airplane_code = airplane.airplane_code AND airplane.airline_id = airline.airline_id AND flight.flight_id = '$depart_id' AND flight.date = '$departDate' AND fare.pass_type = '$pass_type'";
                            $result1 = mysqli_query($conn, $sq1);
                            $row1 = mysqli_fetch_array($result1);
                            $money = $row1["amount"] * $row1["discount_rate"];
                            echo "<li id='".$favorite_id."_favorite'>
                                    <div class='row content card'>
                                        <div class='col-md-9'>
                                            <div class='flight_card'>
                                                <table class='flight_info'>
                                                    <tr>
                                                        <th style='width: 30%'>".$row1["depart_code"]." - ".$row1["arrive_code"]."</th>
                                                        <th style='width: 30%'>".$row1["date"]."</th>
                                                        <th style='width: 40%'>".$row1["depart_time"]." - ".$row1["arrive_time"]."</th>
                                                    </tr>
                                                    <tr>
                                                        <td style='width: 30%'>".$row1["maker"].$row1["model_num"]."</td>
                                                        <td style='width: 30%'>".$row1["pass_type"]."</td>
                                                        <td style='width: 40%'>".$row1["company"]." Airline</td>
                                                    </tr>
                                                </table>
                                            </div>
                                        </div>
                                        <div class='col-md-3 text-center flight_price'>
                                            <h3><b>$".$money."</b></h3>
                                            <div>
                                                <button type='button' class='btn btn-primary order_btn' onclick='window.location.href=\"order.php?oneRound=".$oneRound."&economyBusiness=".$pass_type."&departFlight_id=".$depart_id."&departDate=".$departDate."&price=".$money."\"'>Order</button>
                                                <button type='button' class='btn btn-primary delete_btn' id='".$favorite_id."_delete'> Delete</button>
                                            </div>
                                        </div>
                                    </div>
                                </li>";
                        } else {
                            $depart_id = $row["depart_id"];
                            $departDate = $row["depart_date"];
                            $return_id = $row["return_id"];
                            $returnDate = $row["return_date"];
                            $pass_type = $row["pass_type"];
                            $sq1 = "SELECT * FROM flight, flight_leg, fare, airline, airplane WHERE flight.flight_id = flight_leg.flight_id AND flight_leg.flight_id = fare.flight_id AND flight_leg.airplane_code = airplane.airplane_code AND airplane.airline_id = airline.airline_id AND flight.flight_id = '$depart_id' AND flight.date = '$departDate' AND fare.pass_type = '$pass_type'";
                            $sq2 = "SELECT * FROM flight, flight_leg, fare, airline, airplane WHERE flight.flight_id = flight_leg.flight_id AND flight_leg.flight_id = fare.flight_id AND flight_leg.airplane_code = airplane.airplane_code AND airplane.airline_id = airline.airline_id AND flight.flight_id = '$return_id' AND flight.date = '$returnDate' AND fare.pass_type = '$pass_type'";
                            $result1 = mysqli_query($conn, $sq1);
                            $result2 = mysqli_query($conn, $sq2);
                            $row1 = mysqli_fetch_array($result1);
                            $row2 = mysqli_fetch_array($result2);
                            $money = $row1["amount"] * $row1["discount_rate"] + $row2["amount"] * $row2["discount_rate"];
                            echo "<li id='".$favorite_id."_favorite'>
                                    <div class='row content card'>
                                        <div class='col-md-9'>
                                            <div class='flight_card'>
                                                <table class='flight_info'>
                                                    <tr>
                                                        <th style='width: 30%'>".$row1["depart_code"]." - ".$row1["arrive_code"]."</th>
                                                        <th style='width: 30%'>".$row1["date"]."</th>
                                                        <th style='width: 40%'>".$row1["depart_time"]." - ".$row1["arrive_time"]."</th>
                                                    </tr>
                                                    <tr>
                                                        <td style='width: 30%'>".$row1["maker"].$row1["model_num"]."</td>
                                                        <td style='width: 30%'>".$row1["pass_type"]."</td>
                                                        <td style='width: 40%'>".$row1["company"]." Airline</td>
                                                    </tr>
                                                    <tr>
                                                        <th style='width: 30%'>".$row2["depart_code"]." - ".$row2["arrive_code"]."</th>
                                                        <th style='width: 30%'>".$row2["date"]."</th>
                                                        <th style='width: 40%'>".$row2["depart_time"]." - ".$row2["arrive_time"]."</th>
                                                    </tr>
                                                    <tr>
                                                        <td style='width: 30%'>".$row1["maker"].$row2["model_num"]."</td>
                                                        <td style='width: 30%'>".$row2["pass_type"]."</td>
                                                        <td style='width: 40%'>".$row2["company"]." Airline</td>
                                                    </tr>
                                                </table>
                                            </div>
                                        </div>
                                        <div class='col-md-3 text-center flight_price'>
                                            <h3><b>$".$money."</b></h3>
                                            <div>
                                                <button type='button' class='btn btn-primary order_btn' onclick='window.location.href=\"order.php?oneRound=".$oneRound."&economyBusiness=".$pass_type."&departFlight_id=".$depart_id."&departDate=".$departDate."&returnFlight_id=".$return_id."&returnDate=".$returnDate."&price=".$money."\"'>Order</button>
                                                    <button type='button' class='btn btn-primary delete_btn' id='".$favorite_id."_delete'> Delete</button>
                                            </div>
                                        </div>
                                    </div>
                                </li>";
                        }
                    }
                ?>
                <!-- <li>
                    <div class='row content card' >
                        <div class='col-md-9'>
                            <div class='flight_card'>
                                <table  class='flight_info'>
                                    <tr>
                                        <th style='width: 40%'>6:00 am - 10:00 pm</th>
                                        <th style='width: 30%'>0 stop</th>
                                        <th style='width: 20%'>4h 0m </th>
                                    </tr>
                                    <tr>
                                        <td>Hainan Airline</td>
                                        <td></td>
                                        <td>DFW-NYC</td>
                                    </tr>
                                    <tr>
                                        <th style='width: 40%'>12:00 am - 7:00 pm</th>
                                        <th style='width: 30%'>0 stop</th>
                                        <th style='width: 20%'>7h 0m </th>
                                    </tr>
                                    <tr>
                                        <td>Hainan Airline</td>
                                        <td></td>
                                        <td>NYC-Paris</td>
                                    </tr>

                                </table>
                            </div>
                        </div>
                        <div class='col-md-3 text-center flight_price'>
                            <h3><b>$100</b></h3>
                            <p style='color: grey'>Hainan Airline</p>
                            <div>
                                <button type='button' class='btn btn-primary order_btn'> Order</button>
                                <button type='button' class='btn btn-primary delete_btn' id='delete_favor'> Delete</button>
                            </div>
                        </div>
                    </div>
                </li> -->
            </ul>
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


<script type="text/javascript">


</script>

<?php
    $has = ($name != null);
    if ($has) {
        $usrname = "\"$name\"";
        echo "<script type=text/javascript>hasLogin($usrname, $usr_type)</script>";
    } else {
        echo "<script type=text/javascript>showLoginSignup()</script>";
    }
?>
</html>






