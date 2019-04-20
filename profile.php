<?php
session_start();

$name = $_SESSION["account_username"];
$usr_type= $_SESSION['user_type'];
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


    <!-- Custom CSS -->
    <link rel="stylesheet" href="stylesheets/main.css">
    <link rel="stylesheet" href="stylesheets/nav.css">
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

<div class="container"  style="margin:50px 0px 10px 0px; padding-left: 0;">
<!--    --><?php //include 'order_list.php';?>

    <div class="w3-sidebar w3-card-4" style="width:200px" id="mySidebar">
        <div class="w3-bar-block">
            <a class="w3-bar-item w3-button w3-blue" href="profile.php" style="text-decoration: none">Profile</a>
            <a class="w3-bar-item w3-button" href="order_list.php" style="text-decoration: none">Order</a>
            <a class="w3-bar-item w3-button" href="favorites.php" style="text-decoration: none">Favorite List</a>
            <a class="w3-bar-item w3-button" href="passenger.php" style="text-decoration: none">Passenger List</a>
        </div>
    </div>

    <div id="user_profile">
        <h5 style="margin-top:20px; margin-left:210px;">You can edit your email address and password here.</h5>

        <div id="email_info">
            <?php include 'email.php'?>
        </div>

        <div id="password_info">
            <?php include 'password.php'?>
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
if ($has){
    $usrname = "\"$name\"";
    echo "<script type=text/javascript>hasLogin($usrname, $usr_type)</script>";
} else {
    echo "<script type=text/javascript>showLoginSignup()</script>";
}
?>
</body>

</html>