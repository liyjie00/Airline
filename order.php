<?php
	session_start();
    $oneRound = $_GET["oneRound"];
    $economyBusiness = $_GET["economyBusiness"];

    $name = $_SESSION["account_username"];
    $usr_type= $_SESSION['user_type'];

    if($oneRound == "one") {
    	$departFlight_id = $_GET["departFlight_id"];
    	$departDate = $_GET["departDate"];
    } else {
    	$departFlight_id = $_GET["departFlight_id"];
    	$departDate = $_GET["departDate"];
    	$returnFlight_id = $_GET["returnFlight_id"];
    	$returnDate = $_GET["returnDate"];
    }
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
    <script src="javascripts/checkLogin.js"></script>


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
    <div class="row content card" >
        <div class="">
            <p class="flight_card">
            <table  class="flight_info">
                <?php
                    $ticket_money = 0;
                    if($oneRound == "one") {
                        $sql = "SELECT * FROM flight, flight_leg, fare, airline, airplane WHERE flight.flight_id = flight_leg.flight_id AND flight_leg.flight_id = fare.flight_id AND flight_leg.airplane_code = airplane.airplane_code AND airplane.airline_id = airline.airline_id AND flight.date = '$departDate' AND fare.pass_type = '$economyBusiness' AND flight.flight_id = '$departFlight_id'";
                        $result = mysqli_query($conn, $sql);
                        $row = mysqli_fetch_array($result);
                        $ticket_money = $row["amount"] * $row["discount_rate"];
                        echo "<tr><th style='width: 40%'>".$row["depart_code"]." - ".$row["arrive_code"]."</th><th style='width: 40%'>".$row["date"]."</th><th style='width: 20%'>".$row["depart_time"]." - ".$row["arrive_time"]."</th></tr><tr><td style='width: 40%'>".$row["maker"].$row["model_num"]."</td><td style='width: 40%'>".$row["pass_type"]."</td><td style='width: 20%'>".$row["company"]." Airline</td></tr>";
                    } else {
                        $sq1 = "SELECT * FROM flight, flight_leg, fare, airline, airplane WHERE flight.flight_id = flight_leg.flight_id AND flight_leg.flight_id = fare.flight_id AND flight_leg.airplane_code = airplane.airplane_code AND airplane.airline_id = airline.airline_id AND flight.date = '$departDate' AND fare.pass_type = '$economyBusiness' AND flight.flight_id = '$departFlight_id'";
                        $sq2 = "SELECT * FROM flight, flight_leg, fare, airline, airplane WHERE flight.flight_id = flight_leg.flight_id AND flight_leg.flight_id = fare.flight_id AND flight_leg.airplane_code = airplane.airplane_code AND airplane.airline_id = airline.airline_id AND flight.date = '$returnDate' AND fare.pass_type = '$economyBusiness' AND flight.flight_id = '$returnFlight_id'";
                        $result1 = mysqli_query($conn, $sq1);
                        $result2 = mysqli_query($conn, $sq2);
                        $row1 = mysqli_fetch_array($result1);
                        $row2 = mysqli_fetch_array($result2);
                        $ticket_money = $row1["amount"] * $row1["discount_rate"] + $row2["amount"] * $row2["discount_rate"];
                        echo "<tr><th style='width: 40%'>".$row1["depart_code"]." - ".$row1["arrive_code"]."</th><th style='width: 40%'>".$row1["date"]."</th><th style='width: 20%'>".$row1["depart_time"]." - ".$row1["arrive_time"]."</th></tr><tr><td style='width: 40%'>".$row1["maker"].$row1["model_num"]."</td><td style='width: 40%'>".$row1["pass_type"]."</td><td style='width: 20%'>".$row1["company"]." Airline</td></tr><tr><th style='width: 40%'>".$row2["depart_code"]." - ".$row2["arrive_code"]."</th><th style='width: 40%'>".$row2["date"]."</th><th style='width: 20%'>".$row2["depart_time"]." - ".$row2["arrive_time"]."</th></tr><tr><td style='width: 40%'>".$row1["maker"].$row2["model_num"]."</td><td style='width: 40%'>".$row2["pass_type"]."</td><td style='width: 20%'>".$row2["company"]." Airline</td></tr>";
                    }
                    
                ?>
            </table>
        </p>
        </div>
    </div>

    <div class="row content card" >
        <div class="order_detail">
            <fieldset id="passenger_list">
                <legend>Passengers Info: </legend>
                <?php
                	$sql = "SELECT *  FROM account, account_passenger, passenger WHERE account.account_id = account_passenger.account_id AND passenger.p_id = account_passenger.p_id AND account.account_id = '$account_id'";
                	$result = mysqli_query($conn, $sql);
                	while($row = mysqli_fetch_array($result)){
   						$pname = $row["lname"].", ".$row["fname"];
   						echo "<label for='".$row["p_id"]."' id='".$row["p_id"]."_label'>".$pname."<input type='checkbox' name='".$row["p_id"]."'id='".$row["p_id"]."'></label>";
    				}
                    mysqli_close($conn);
                ?>
            </fieldset>
            <hr>
            <div id="pass_info">
            </div>
            <?php include 'add_passenger.php'; ?>
            <button class="btn add_pass" type="button">Add a new passenger</button>
        </div>
    </div>

    <div class="row content card" >
        <div class="order_detail">
            <fieldset>
                <legend>Insurance: </legend>
                <div id="insurance_info">
                    <div class="row selected_pass">
                        <div class="col-sm-2">
                            <div class="info_part" style="vertical-align: middle">
                            <h4 style='color:black'>None</h4>
                            </div>
                            
                        </div>
                        <div class="col-sm-8" style='padding: 0'>
                            <div class="info_part" style="height:100px;border-left: 1px solid lightgrey; border-right: 1px solid lightgrey">
                                <p style="margin:10px">Do not need any insurance.</p>
                            </div>
                        </div>
                        <div class="col-sm-2">
                            <div class="info_part" style='text-align:center'>
                                <h4>$0</h4>
                                <label  style="background-color:white; border:white;" for='no_insurance'> Choose plan</label>                
                                <input type="radio" id='0_insurance' value='0' name='insurance' class='insurance' checked="true">
                            </div>
                        </div>
                    </div>
                    <hr>
                </div>

                <div id="insurance_info">
                    <div class="row selected_pass">
                        <div class="col-sm-2">
                            <div class="info_part" style="vertical-align: middle">
                            <br>
                            <h4 style='color:black'>iTravel Insurance</h4>
                            </div>
                            
                        </div>
                        <div class="col-sm-8" style='padding: 0'>
                            <div class="info_part" style="border-left: 1px solid lightgrey; border-right: 1px solid lightgrey">
                                <table style='margin-left:10px'>
                                    <tr>
                                        <td style='width:20%'>Interruption:</td>
                                        <td style='width:10%'>125%</td>
                                        <td style='width:5%'></td>
                                        <td style='width:20%'>Hospital of choice:</td>
                                        <td style='width:10%'>No</td>
                                    </tr>
                                    <tr>
                                        <td>Cancellation:</td>
                                        <td>100%</td>
                                        <td></td>
                                        <td>Financial default:</td>
                                        <td>Yes</td>
                                    </tr>
                                    <tr>
                                        <td>Cancel for any reason:</td>
                                        <td>No</td>
                                        <td></td>
                                        <td>Terrorism:</td>
                                        <td>Yes</td>
                                    </tr>
                                    <tr>
                                        <td>Cancel for work reason:</td>
                                        <td>Yes</td>
                                        <td></td>
                                        <td>Trip delay:</td>
                                        <td>$250 P/D ($500 Max)</td>
                                    </tr>
                                    <tr>
                                        <td>Medical evacuation:</td>
                                        <td>$1,000,000</td>
                                        <td></td>
                                        <td>Rental collision:</td>
                                        <td>$40,000</td>
                                    </tr>
                                    <tr>
                                        <td>Medical sickness:</td>
                                        <td>$100,000</td>
                                        <td></td>
                                        <td>Baggage loss:</td>
                                        <td>$750</td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                        <div class="col-sm-2">
                            <div class="info_part" style='text-align:center'>
                                <h4>$20</h4>
                                <label  style="background-color:white; border:white;" for='1_insurance'> Choose plan</label>                
                                <input type="radio" id='1_insurance' value='20' name='insurance' class='insurance'>
                            </div>
                        </div>
                    </div>
                    <hr>
                </div>

                <div id="insurance_info">
                    <div class="row selected_pass">
                        <div class="col-sm-2">
                            <div class="info_part" style="vertical-align: middle">
                            <br>
                            <h4 style='color:black'>World Trip Insurance</h4>
                            </div>
                            
                        </div>
                        <div class="col-sm-8" style='padding: 0'>
                            <div class="info_part" style="border-left: 1px solid lightgrey; border-right: 1px solid lightgrey">
                                <table style='margin-left:10px'>
                                    <tr>
                                        <td style='width:20%'>Interruption:</td>
                                        <td style='width:10%'>150%</td>
                                        <td style='width:5%'></td>
                                        <td style='width:20%'>Hospital of choice:</td>
                                        <td style='width:10%'>No</td>
                                    </tr>
                                    <tr>
                                        <td>Cancellation:</td>
                                        <td>100%</td>
                                        <td></td>
                                        <td>Financial default:</td>
                                        <td>Yes</td>
                                    </tr>
                                    <tr>
                                        <td>Cancel for any reason:</td>
                                        <td>No</td>
                                        <td></td>
                                        <td>Terrorism:</td>
                                        <td>Yes</td>
                                    </tr>
                                    <tr>
                                        <td>Cancel for work reason:</td>
                                        <td>No</td>
                                        <td></td>
                                        <td>Trip delay:</td>
                                        <td>$200 P/D ($1,000 Max)</td>
                                    </tr>
                                    <tr>
                                        <td>Medical evacuation:</td>
                                        <td>$500,000</td>
                                        <td></td>
                                        <td>Rental collision:</td>
                                        <td>$50,000</td>
                                    </tr>
                                    <tr>
                                        <td>Medical sickness:</td>
                                        <td>$100,000</td>
                                        <td></td>
                                        <td>Baggage loss:</td>
                                        <td>$1,000</td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                        <div class="col-sm-2">
                            <div class="info_part" style='text-align:center'>
                                <h4>$32</h4>
                                <label  style="background-color:white; border:white;" for='2_insurance'> Choose plan</label>                
                                <input type="radio" id='2_insurance' value='32' name='insurance' class='insurance'>
                            </div>
                        </div>
                    </div>
                    <hr>
                </div>

                <div id="insurance_info">
                    <div class="row selected_pass">
                        <div class="col-sm-2">
                            <div class="info_part" style="vertical-align: middle">
                            <br>
                            <h4 style='color:black'>YouBang Insurance</h4>
                            </div>
                            
                        </div>
                        <div class="col-sm-8" style='padding: 0'>
                            <div class="info_part" style="border-left: 1px solid lightgrey; border-right: 1px solid lightgrey">
                                <table style='margin-left:10px'>
                                    <tr>
                                        <td style='width:20%'>Interruption:</td>
                                        <td style='width:10%'>100%</td>
                                        <td style='width:5%'></td>
                                        <td style='width:20%'>Hospital of choice:</td>
                                        <td style='width:10%'>No</td>
                                    </tr>
                                    <tr>
                                        <td>Cancellation:</td>
                                        <td>100%</td>
                                        <td></td>
                                        <td>Financial default:</td>
                                        <td>No</td>
                                    </tr>
                                    <tr>
                                        <td>Cancel for any reason:</td>
                                        <td>No</td>
                                        <td></td>
                                        <td>Terrorism:</td>
                                        <td>Yes</td>
                                    </tr>
                                    <tr>
                                        <td>Cancel for work reason:</td>
                                        <td>No</td>
                                        <td></td>
                                        <td>Trip delay:</td>
                                        <td>$100 P/D ($300 Max)</td>
                                    </tr>
                                    <tr>
                                        <td>Medical evacuation:</td>
                                        <td>$100,000</td>
                                        <td></td>
                                        <td>Rental collision:</td>
                                        <td>$25,000</td>
                                    </tr>
                                    <tr>
                                        <td>Medical sickness:</td>
                                        <td>$100,000</td>
                                        <td></td>
                                        <td>Baggage loss:</td>
                                        <td>$750</td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                        <div class="col-sm-2">
                            <div class="info_part" style='text-align:center'>
                                <h4>$33</h4>
                                <label  style="background-color:white; border:white;" for='3_insurance'> Choose plan</label>                
                                <input type="radio" id='3_insurance' value='33' name='insurance' class='insurance'>
                            </div>
                        </div>
                    </div>
                    <hr>
                </div>

            </fieldset>
            
            <div id = "order_table">
            <table>
                <tr>
                    <th style="width:100%; font-size: 25px">Total:</th>
                    <th id="total_price" style="width:100%; font-size: 25px">$0</th>
                </tr>
                <tr>
                    <td>
                    <button id="cancel_button" class="btn cancel_order_btn" style="width:200px; background-color: red;" onMouseOver="this.style.color='white'" type="button">Cancel</button>
                    </td>
                    <td>
                    <button id="order_button" class="btn place_order_btn" style="width:200px" type="button">Place your order</button>
                    </td>
                </tr>
            </table>
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
<?php
$has = ($name != null);
// $_SESSION['login_source'] = $_SERVER['HTTP_HOST'];
//    echo "<script type=text/javascript>console.log(\"".$_SERVER['REQUEST_URI']."\");</script>";
if ($has){
    $usrname = "\"$name\"";
    // $type = "\"$usr_type\"";
    echo "<script type=text/javascript>hasLogin($usrname, $usr_type)</script>";
} else {
    echo "<script type=text/javascript>showLoginSignup()</script>";
}
?>

</body>

</html>

<script type="text/javascript">
    $(document).ready(function(){
        $("#cancel_button").click(function(){
            window.location.href = "index.php";
        });
        $("#order_button").click(function(){
            var url = "payment.php?p_id=";
            p_id = ""
            $('input[type=checkbox]').each(function(i, item){
                var isCheck = $(this).prop("checked");
                if(isCheck) {
                    var id = $(this).prop("id");
                    p_id += id + ",";
                }
            });
            if(p_id == "") {
                $("#order_table").append("<h2 style='color:red'>Please select at least one passenger!</h2>")
            } else {
                url += p_id;
                url = url.substring(0, url.length - 1);
                console.log(url);
                var oneRound = "<?php echo $oneRound; ?>";
                var economyBusiness = "<?php echo $economyBusiness; ?>";
                var departFlight_id = "<?php echo $departFlight_id; ?>";
                var departDate = "<?php echo $departDate; ?>";
                var money = $("#total_price").html().substring(1);
                var insurance_type = $("input[name='insurance']:checked").prop("id");
                console.log(money);
                if(oneRound == "one") {
                    url = url + "&oneRound=" + oneRound + "&economyBusiness=" + economyBusiness + "&departFlight_id=" + departFlight_id + "&departDate=" + departDate + "&money=" + money + "&insurance_type=" + insurance_type;
                } else {
                    var returnFlight_id = "<?php echo $returnFlight_id; ?>";
                    var returnDate = "<?php echo $returnDate; ?>";
                    url = url + "&oneRound=" + oneRound + "&economyBusiness=" + economyBusiness + "&departFlight_id=" + departFlight_id + "&departDate=" + departDate + "&returnFlight_id=" + returnFlight_id + "&returnDate=" + returnDate + "&money=" + money + "&insurance_type=" + insurance_type;
                }
                window.location.href = url;
            }
        });
        $('.insurance, input[type=checkbox]').change(function(){
            var passenger_count = 0;
            $('input[type=checkbox]').each(function() {
                var isCheck = $(this).prop("checked");
                if(isCheck) {
                    passenger_count = passenger_count + 1;
                }
            });
            var insurance_price = $("input[name='insurance']:checked").val();
            var ticket_money = "<?php echo $ticket_money; ?>";
            var oneRound = "<?php echo $oneRound; ?>";
            var money = (Number(ticket_money) + Number(insurance_price)) * passenger_count;
            if(oneRound == "round") {
                money = (Number(ticket_money) + 2 * Number(insurance_price)) * passenger_count;
            }
            $("#total_price").html("$" + money);
        });
    });
</script>
