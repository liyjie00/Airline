<?php
session_start();
// $_SESSION['username'] = "wqxhlz32";
// $name = $_SESSION['username'];

// $a_id = "";
// $user = 'root';
// $password = 'WQjb1234!';
// $db = 'test';
// $host = '149.28.213.37';
// $port = 3306;
// $conn = mysqli_connect($host, $user, $password, $db, $port);
// if (!$conn){
//     echo "Connection failed!";
//     exit();
// }
// $sql = "SELECT * FROM account WHERE account.account_id = '$a_id'";
// $result = mysqli_query($conn, $sql);
// $row = mysqli_fetch_assoc($result);
// $usr_type = $row['user_type'];
// $_SESSION['username'] = $row['username'];
// // mysqli_close($conn);
// $_SESSION['usertype'] = $usr_type;
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
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js"></script>

    <script src="javascripts/main.js"></script>
    <script src="javascripts/slide_box.js"></script>
    <script src="javascripts/dropdown_menu.js"></script>
    <script src="javascripts/checkLogin.js"></script>

    <!-- Custom CSS -->
    <link href="stylesheets/half-slider.css" rel="stylesheet">

    <link rel="stylesheet" href="stylesheets/main.css">
    <link rel="stylesheet" href="stylesheets/nav.css">
    <link rel="stylesheet" href="stylesheets/box.css">
    <link rel="stylesheet" href="stylesheets/card.css">
    <link rel="stylesheet" href="stylesheets/dropdown.css">
    <link rel="stylesheet" href="stylesheets/autocomplete.css">

    <!-- HTML5 Shim and Respond.js IE8 support of HTML5 elements and media queries -->
    <!-- WARNING: Respond.js doesn't work if you view the page via file:// -->
    <!--[if lt IE 9]>
    <script src="https://oss.maxcdn.com/libs/html5shiv/3.7.0/html5shiv.js"></script>
    <script src="https://oss.maxcdn.com/libs/respond.js/1.4.2/respond.min.js"></script>
    <![endif]-->
</head>

<body>

<!-- Navigation -->
<nav class="navbar navbar-inverse navbar-fixed-top" role="navigation" style="border-bottom: 3px solid #10a2ff">
    <div class="container">
        <!-- Brand and toggle get grouped for better mobile display -->
        <div class="navbar-header">
            <button type="button" class="navbar-toggle" data-toggle="collapse"
                    data-target="#bs-example-navbar-collapse-1">
                <span class="sr-only">Toggle navigation</span>
                <span class="icon-bar"></span>
                <span class="icon-bar"></span>
                <span class="icon-bar"></span>
            </button>
            <a class="navbar-brand" href="index.php"><img class="logo" src="img/quzer-logo2.png" alt="quzer_logo"></a>
        </div>
        <!-- Collect the nav links, forms, and other content for toggling -->
        <div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1">
            <ul class="nav navbar-nav navbar-right">

            </ul>
        </div>
    </div>
</nav>
<!-- Image Background Carousel Header -->
<div class="main">
    <div id="myCarousel" class="carousel slide">
        <!-- Wrapper for Slides -->
        <div class="carousel-inner">
            <div class="item active">
                <div class="fill" style="background-image:url('img/beach.jpg');"></div>
            </div>
            <div class="item">
                <div class="fill" style="background-image:url('img/greatwall.jpeg');"></div>
            </div>
            <div class="item">
                <div class="fill" style="background-image:url('img/paris.jpeg');"></div>
            </div>
        </div>
    </div>


    <div class="row" id="query_block">
        <?php include 'main_query.php'; ?>
    </div>

    <div class="row" id="recommend_block">
        <?php include 'recommendations.php'; ?>
    </div>


    <div class="row" id="signup_block">
        <?php include 'signup.php'; ?>
    </div>

    <div class="row" id="login_block">
        <?php include 'login.php'; ?>
    </div>

</div>
<div style="text-align: center">
    <h2>More</h2>
    <hr>
</div>

<!-- Page Content -->
<div class="container card_container">
    <div style="position: relative; height: 70px">
        <div class="col-lg-10" style="position: absolute; bottom: 0; left: 0">
            <h2>Special Discounts</h2>
        </div>
        <div class="col-lg-2" style="position: absolute; bottom: 0; right: 0">
            <p><a>more..</a></p>
        </div>
    </div>
    <?php
    include 'special_discounts.php';
    ?>
</div>
<div class="container card_container">
    <div style="position: relative; height: 70px">
        <div class="col-lg-10" style="position: absolute; bottom: 0; left: 0">
            <h2>Popular Flights</h2>
        </div>
        <div class="col-lg-2" style="position: absolute; bottom: 0; right: 0">
            <p><a>more..</a></p>
        </div>
    </div>
    <?php
    include 'popular_flights.php';
    ?>
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
    $('.carousel').carousel({
        interval: 3000, //changes the speed
        pause: false
    })
</script>

<?php
//echo "<script type=text/javascript>print()</script>";
$has = ($name != null);
if ($has) {
    $usrname = "\"$name\"";

    echo "<script type=text/javascript>hasLogin($usrname, $usr_type)</script>";
} else {
    echo "<script type=text/javascript>showIndexLoginSignup()</script>";
}
?>


</body>

</html>
