<?php
    session_start();
    $oneRound = "";
    $economyBusiness = "";
    $from = "";
    $to = "";
    $departDate = "";
    $returnDate = "";

    $name = $_SESSION["account_username"];
    $usr_type= $_SESSION['user_type'];

    if($_SERVER["REQUEST_METHOD"] == "POST"){
        
        $oneRound = test_input($_POST["one-round"]);
        $economyBusiness = test_input($_POST["economy-business"]);
        $from = test_input($_POST["from"]);
        $to = test_input($_POST["to"]);
        $departDate = test_input($_POST["depart_date"]);
       

        if($oneRound == "round") {
            $returnDate = test_input($_POST["return_date"]);
        }
        $check = False;
        if($oneRound == "one") {
            $check = !empty($from) && !empty($to) && !empty($departDate);
        } else {
            $check = !empty($from) && !empty($to) && !empty($departDate) && !empty($returnDate);
        }
        if($check) {
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
        } else {
            $_SESSION["check"] = False;
            header("location: index.php");
            exit();
        }
    } else{
        header("location: index.php");
        exit();
    }

    function test_input($data){
        $data = trim($data);
        $data = stripslashes($data);
        $data = htmlspecialchars($data);
        return $data;
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
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js"></script>
    
    <script src="javascripts/main.js"></script>
    <script src="javascripts/slide_box.js"></script>
    <script src="javascripts/dropdown_menu.js"></script>
    <script src="javascripts/search.js"></script>
    <script src="javascripts/popup.js"></script>
    <script src="javascripts/checkLogin.js"></script>


    <!-- Custom CSS -->
    <link href="stylesheets/half-slider.css" rel="stylesheet">

    <link rel="stylesheet" href="stylesheets/main.css">
    <link rel="stylesheet" href="stylesheets/nav.css">
    <link rel="stylesheet" href="stylesheets/box.css">
    <link rel="stylesheet" href="stylesheets/card.css">
    <link rel="stylesheet" href="stylesheets/dropdown.css">
    <link rel="stylesheet" href="stylesheets/autocomplete.css">
    <link rel="stylesheet" href="stylesheets/popup.css">
    <link rel="stylesheet" href="stylesheets/search.css">

    <!-- HTML5 Shim and Respond.js IE8 support of HTML5 elements and media queries -->
    <!-- WARNING: Respond.js doesn't work if you view the page via file:// -->
    <!--[if lt IE 9]>
    <script src="https://oss.maxcdn.com/libs/html5shiv/3.7.0/html5shiv.js"></script>
    <script src="https://oss.maxcdn.com/libs/respond.js/1.4.2/respond.min.js"></script>
    <![endif]-->
    <script>

    </script>
</head>

<body>
<!-- Navigation -->
<?php include 'nav.php'; ?>

<div>
    <form id="query_info" action="search.php" method="post">
        <div class="search_query">
            <select id="s_one-round" name="one-round">
                <option value="one" <?php if($_POST["one-round"] == "one"){echo "selected";}?>>One-way</option>
                <option value="round" <?php if($_POST["one-round"] != "one"){echo "selected";}?>>Round-way</option>
            </select>
            <select name="economy-business">
                <option value="economy" <?php if($_POST["economy-business"] == "economy"){echo "selected";}?>>Economy</option>
                <option value="business" <?php if($_POST["economy-business"] != "economy"){echo "selected";}?>>Business</option>
            </select>
            <br>
            <div class="search_input">
                <input type="text" id="s_from" name="from" placeholder="From" value="<?php echo $_POST["from"];?>">
                <img id="s_change_place" src="img/arrow-change-white.png" alt="arrow">
                <input type="text" id="s_to" name="to" placeholder="To" value="<?php echo $_POST["to"];?>">

                <input id="s_depart_date" name="depart_date" type="date" value="<?php echo $_POST["depart_date"];?>">

                <div id="s_return">
                    <?php
                    if ($_POST["one-round"] != "one"){
                        echo "<input id='s_return_date' name='return_date' type='date' style='float:left' value='".$_POST["return_date"]."''>";
                    }
                    ?>
                </div>
                <button id="s_search_btn" class="btn" style="font-size: 120%"><span class="glyphicon glyphicon-search"></span> Search</button>

            </div>
        </div>
    </form>
</div>
      
<div class="container-fluid text-center">    
  <div class="row content">
    <div class="col-md-2 sidenav" style="text-align: left;">
        <div id="price_options" style="padding-left:20%">
            <h4>Price</h4>
            <input type="checkbox"  name="0_500" id="0_500" checked>
            <label for="0_500">$0 - $500</label>
            <br>
            <input type="checkbox"  name="501_1000" id="501_1000"  checked>
            <label for="501_1000">$501 - $1000</label>
            <br>
            <input type="checkbox"  name="1001" id="1001"  checked>
            <label for="1001"> $1000</label>
        </div>
        <button id="update_btn" class="btn" style="height:30px;width:150px; text-align: center">Update result</button>
        <hr>    

    </div>

    <div class="col-md-7 text-left">
        <ul class="query_result" id = "query_result">
            <?php include 'search_flight.php'?>
        </ul>
    </div>
    
    <div class="col-md-3 sidenav">
        <div class="ad">
            <?php
            include 'special_discounts.php';
            ?>
        </div>
    </div>
  </div>
</div>

<div>
    <?php include 'signup_popup.php';?>
    <?php include 'login_popup.php';?>
</div>

<div>
    <div id="notify_add_fav_modal" class="modal">
        <div clas="close_icon">
            <p class="close" title="Close Modal">&times;</p>
        </div>
        <div class="modal-content" style="width: 30%;text-align: center">
            <div class="container popup_container">

                <h3 style="color: black;">Add to favorite list</h3>
                <hr>
                <h4>Success!</h4>
                <hr>
                <div>
                    <button type="button" class="popup_btn cancelbtn" style="width: 100%">OK</button>
                </div>
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
<script>
    function place_order(oneRound, economyBusiness,flight_id, departDate, return_flight_id, returnDate, money){
        <?php echo "var name = '".$name."';";?>
        // alert("name: " + name);
        if (name == null || name == "") {
            call_login_popup();
        } else if (returnDate == 0 ){
            location.href="order.php?oneRound=" + oneRound + "&economyBusiness="+ economyBusiness + "&departFlight_id="+ flight_id + "&departDate=" + departDate + "&price=" + money;
        } else {
            location.href="order.php?oneRound=" + oneRound + "&economyBusiness=" + economyBusiness + "&departFlight_id=" + flight_id + "&departDate=" + departDate + "&returnFlight_id=" + return_flight_id + "&returnDate=" + returnDate + "&price=" + money;
        }
    }

    function test_login_fav1(flight_id, departDate, oneRound, economyBusiness){
        <?php echo "var name = '".$name."';";?>
        if (name == null || name == "") {
            call_login_popup();
        } else {
            addfavor1(flight_id, departDate, oneRound, economyBusiness);
            call_add_fav_success();
        }
    }

    function test_login_fav2(depart_id, departDate, return_id, returnDate, oneRound, economyBusiness){
        <?php echo "var name = '".$name."';";?>
        if (name == null || name == "") {
            call_login_popup();
        } else {
            addfavor2(depart_id, departDate, return_id, returnDate, oneRound, economyBusiness);
            call_add_fav_success();
        }
    }

    function call_add_fav_success(){
        $('#notify_add_fav_modal').addClass('show');
    }

    $('.carousel').carousel({
        interval: 3000, //changes the speed
        pause: false
    })

    $(document).ready(function(){
        $("#update_btn").click(function(){
            // var less_than_500 = $("#0_500").val($(this).is(':checked')); 
            var less_than_500 = "on";
            if (!$("#0_500").is(':checked')){
                 less_than_500 = "off";
            }
            var less_than_1000 = "on";
            if (!$("#501_1000").is(':checked')){
                 less_than_1000 = "off";
            }
            var greater_than_1000 = "on";
            if (!$("#1001").is(':checked')){
                 greater_than_1000 = "off";
            }

            var one_round = <?php echo "\"".$_POST["one-round"]."\"";?>;
            var economy_business = <?php echo "\"".$_POST["economy-business"]."\"";?>;
            var from = <?php echo "\"".$_POST["from"]."\"";?>;
            var to = <?php echo "\"".$_POST["to"]."\"";?>;
            var depart_date = <?php echo "\"".$_POST["depart_date"]."\"";?>;
            var return_date = <?php echo "\"".$_POST["return_date"]."\"";?>;
            
            $.ajax({
                type : 'post',
                url : 'search_flight.php',
                headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
                data :{
                    less_than_500 : less_than_500,
                    less_than_1000 : less_than_1000,
                    greater_than_1000 : greater_than_1000, 
                    one_round : one_round,
                    economy_business : economy_business,
                    from : from,
                    to : to,
                    depart_date : depart_date,
                    return_date : return_date,
                },

                contentType: "application/json; charset=utf-8",
                
                success: function(response) {
                    
                    $("#query_result").html(response);
                },
                error: function() {
                }
            });
        });
    });


</script>
<?php
    $has = ($name != null);
    // $_SESSION['login_source'] = $_SERVER['HTTP_HOST'];
    // echo "<script type=text/javascript>console.log(\"".$_SERVER['REQUEST_URI']."\");</script>";
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
