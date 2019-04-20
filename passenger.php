<?php
session_start();

$name = $_SESSION["account_username"];
$usr_type = $_SESSION['user_type'];


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

    <link rel="stylesheet" href="stylesheets/w3.css">

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

<div class="container" style="margin:50px 0px 10px 0px; padding-left: 0;">
    <div class="w3-sidebar w3-card-4" style="width:200px" id="mySidebar">
        <div class="w3-bar-block">
            <a class="w3-bar-item w3-button" href="profile.php" style="text-decoration: none">Profile</a>
            <a class="w3-bar-item w3-button" href="order_list.php" style="text-decoration: none">Order</a>
            <a class="w3-bar-item w3-button" href="favorites.php" style="text-decoration: none">Favorite List</a>
            <a class="w3-bar-item w3-button w3-blue" href="passenger.php" style="text-decoration: none">Passenger List</a>
        </div>
    </div>

    <div id="main" class="container" style="margin-left:210px">
        <!--        <h5>Order list</h5>-->
        <p></p>
        <div id="pass_info">
            <legend>Passengers Info: </legend>
            <?php
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
            $account_id = $_SESSION['account_id'];

            $sql = "SELECT * FROM passenger WHERE passenger.p_id in (SELECT ap.p_id FROM account_passenger as ap WHERE ap.account_id = $account_id)";

            $result = mysqli_query($conn, $sql);

            while($row = mysqli_fetch_array($result)){
                $isMale = "checked";
                $isFemale = "";
                if($row['gender'] == "F") {
                    $isMale = "";
                    $isFemale = "checked";
                }
                $isAdult = "selected";
                $isChild = "";
                if ($row['is_adult'] == "0") {
                    $isAdult = "";
                    $isChild = "selected";
                }
                $isSSN = "selected";
                $isPassport = "";
                $isDrivLicense = "";
                if ($row['id_type'] == "passport") {
                    $isSSN = "";
                    $isPassport = "selected";
                    $isDrivLicense = "";
                } else if ($row['id_type'] == "driverlicense"){
                    $isSSN = "";
                    $isPassport = "";
                    $isDrivLicense = "selected";
                }

                echo "<div class='row selected_pass' id='".$row['p_id']."_info'><div class='col-sm-6'><div class='info_part'><span>Passenger type: </span><select id='".$row['p_id']."_isAdult'><option value='1' ".$isAdult.">Adult</option><option value='0' ".$isChild.">Child</option></select></div><div class='info_part'><span>First name: </span><input type='text' class='fname' value='".$row['fname']."'></div><div class='info_part'><span>Last name: </span><input type='text' class='lname' value='".$row['lname']."'></div><div class='info_part'><span>Gender:</span><input type='radio' name='".$row['p_id']."_gender' value='M' ".$isMale."><label class='male' for='male'>Male  </label><input type='radio' name='".$row['p_id']."_gender' value='F' ".$isFemale."><label for='female'>Female</label></div><div class='info_part'><span>Nationality: </span><input type='text' class='nationality' value='".$row['nationality']."'></div></div><div class='col-sm-6'><div class='info_part'><span>Id type: </span><select class='id_type' id='".$row['p_id']."_idType'><option value='ssn' ".$isSSN.">SSN</option><option value='passport' ".$isPassport.">Passport</option><option value='driverlicense' ".$isDrivLicense.">Driver License</option></select></div><div class='info_part'><span>ID number: </span><input class='id_number' type='text' value='".$row['id_number']."'></div><div class='info_part'><span>Phone number: </span><input type='text' class='phone' value='".$row['phone']."'></div><div class='info_part'><span>Date of birth: </span><input type='date' class='dob' value='".$row['dob']."'></div><button onclick='update(".$row['p_id'].")' type='button' id='".$row['p_id']."_button' class='btn update_info' style='width:30%; height: 30px; float:left;margin:5px;'>Update info</button><button type='button' id='".$row['p_id']."_delete_btn' class='btn delete_btn' style='width:30%; height: 30px; margin: 5px; background-color:red' onclick='delete_pass(\"".$row['p_id']."\")'>Delete Passenger</button></div></div><hr>";

            }
            mysqli_close($conn);
            ?>

        </div>
        <?php include 'add_passenger.php'; ?>
        <button class="btn add_pass" type="button" id="add_pass1">Add a new passenger</button>
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
    function delete_pass(p_id){
        // alert("delete passenger" + p_id);
        $.ajax({
            url: "delete_passenger_info.php",
            type: "GET",
            data: {"p_id": p_id},
            success: function(data){
                $("#" + p_id + "_info").remove();
            },
            error: function(){
                alert("loading file unsuccessfully!");
            }
        });
    }

    $('#add_pass1').click(function(){
        $('#add_pass_modal').addClass('show');
    });



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






