<?php
$find = False;
if($oneRound == "") {

    $oneRound = $_POST["one_round"];
    $economyBusiness = $_POST["economy_business"];
    $from = $_POST["from"];
    $to = $_POST["to"];
    $departDate = $_POST["depart_date"];
    $returnDate = $_POST["return_date"];
    $less_than_500 = $_POST["less_than_500"];
    $less_than_1000 = $_POST["less_than_1000"];
    $greater_than_1000 = $_POST["greater_than_1000"];

}

if($conn == "") {
    $user = 'root';
    $password = 'WQjb1234!';
    $db = 'test';
    $host = '149.28.213.37';
    $port = 3306;
    $conn = mysqli_connect($host, $user, $password, $db, $port);
}


if($oneRound == "one") {

    $sql = "SELECT * FROM flight, flight_leg, fare, airline, airplane WHERE flight.flight_id = flight_leg.flight_id AND flight_leg.flight_id = fare.flight_id AND flight_leg.airplane_code = airplane.airplane_code AND airplane.airline_id = airline.airline_id AND flight.date = '$departDate' AND fare.pass_type = '$economyBusiness' = flight_leg.depart_code = '$from' AND flight_leg.arrive_code = '$to'";

    $result = mysqli_query($conn, $sql);

    while($row = mysqli_fetch_array($result)){

        $check = True;
        if($economyBusiness == "economy") {
            if($row["num_econ_seat"] == 0) {
                $check = False;

            }
        } else {
            if($row["num_bus_seat"] == 0) {
                $check = False;

            }
        }
        if($check) {
            $money = $row["amount"] * $row["discount_rate"];
            $flight_id = $row["flight_id"];


            if($less_than_500=='off'){
                if($money < 500) {
                    continue;
                }
            } 

            if($less_than_1000=='off'){
                if($money >= 500 && $money < 1000) {
                    continue;
                }
            } 

            if($greater_than_1000=='off'){
                if($money > 1000) {
                    continue;
                }
            } 

            echo "<li>
                    <div class='row content card'>
                        <div class='col-md-9'>
                            <div class='flight_card'>
                                <table class='flight_info'>
                                    <tr>
                                        <th style='width: 30%'>".$row["depart_code"]." - ".$row["arrive_code"]."</th>
                                        <th style='width: 30%'>".$row["date"]."</th>
                                        <th style='width: 40%'>".$row["depart_time"]." - ".$row["arrive_time"]."</th>
                                    </tr>
                                    <tr>
                                        <td style='width: 30%'>".$row["maker"].$row["model_num"]."</td>
                                        <td style='width: 30%'>".$row["pass_type"]."</td>
                                        <td style='width: 40%'>".$row["company"]." Airline</td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                        <div class='col-md-3 text-center flight_price'>
                            <h3><b>$".$money."</b></h3>
                            <div>
                                <button type='button' class='btn btn-primary order_btn' onclick='place_order(\"$oneRound\", \"$economyBusiness\",\"$flight_id\", \"$departDate\" ,\"$money\")'>Order</button>
                                <button type='button' class='btn btn-primary order_btn add_favor' onclick='test_login_fav1(\"$flight_id\", \"$departDate\", \"$oneRound\", \"$economyBusiness\")'>Favorite</button>
                            </div>
                        </div>
                    </div>
                </li>";
            $find = True;
        }
    }
} else {
    $sq1 = "SELECT * FROM flight, flight_leg, fare, airline, airplane WHERE flight.flight_id = flight_leg.flight_id AND flight_leg.flight_id = fare.flight_id AND flight_leg.airplane_code = airplane.airplane_code AND airplane.airline_id = airline.airline_id AND flight.date = '$departDate' AND fare.pass_type = '$economyBusiness' = flight_leg.depart_code = '$from' AND flight_leg.arrive_code = '$to'";
    $sq2 = "SELECT * FROM flight, flight_leg, fare, airline, airplane WHERE flight.flight_id = flight_leg.flight_id AND flight_leg.flight_id = fare.flight_id AND flight_leg.airplane_code = airplane.airplane_code AND airplane.airline_id = airline.airline_id AND flight.date = '$returnDate' AND fare.pass_type = '$economyBusiness' = flight_leg.depart_code = '$to' AND flight_leg.arrive_code = '$from'";
    $result1 = mysqli_query($conn, $sq1);
    while($row1 = mysqli_fetch_array($result1)) {
        $check1 = True;
        if($economyBusiness == "economy") {
            if($row1["num_econ_seat"] == 0) {
                $check1 = False;
            }
        } else {
            if($row1["num_bus_seat"] == 0) {
                $check1 = False;
            }
        }
        if($check1) {
            $depart_id = $row1["flight_id"];
            $money1 = $row1["amount"] * $row1["discount_rate"];
            $result2 = mysqli_query($conn, $sq2);
            while($row2 = mysqli_fetch_array($result2)) {
                $check2 = True;
                if($economyBusiness == "economy") {
                    if($row2["num_econ_seat"] == 0) {
                        $check2 = False;
                    }
                } else {
                    if($row2["num_bus_seat"] == 0) {
                        $check2 = False;
                    }
                }
                if($check2) {
                    $return_id = $row2["flight_id"];
                    $money2 = $row2["amount"] * $row2["discount_rate"];
                    $money = $money1 + $money2;
                    if($less_than_500=='off'){
                        if($money < 500) {
                            continue;
                        }
                    } 

                    if($less_than_1000=='off'){
                        if($money >= 500 && $money < 1000) {
                            continue;
                        }
                    } 

                    if($greater_than_1000=='off'){
                        if($money >= 1000) {
                            continue;
                        }
                    } 

                    echo "<li>
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
                                                        <button type='button' class='btn btn-primary order_btn' onclick='place_order(\"$oneRound\", \"$economyBusiness\",\"$depart_id\", \"$departDate\" ,\"$return_id\" , \"$returnDate\", \"$money\")'>Order</button>                                                        
                                                        <button type='button' class='btn btn-primary order_btn add_favor' onclick='test_login_fav2(\"$depart_id\", \"$departDate\", \"$return_id\", \"$returnDate\", \"$oneRound\", \"$economyBusiness\")'>Favorite</button>
                                                    </div>
                                                </div>
                                            </div>
                                          </li>";
                    $find = True;
                }
            }
        }
    }
}
if($find == False) {
//                    $_SESSION["find"] = False;
//                    header("location: index.php");
    echo "<h2>No result</h2><hr><h5>Please change your searching condtions.</h5>";

}
?>