<?php
    session_start();
    $oneRound = $_GET["oneRound"];
    $economyBusiness = $_GET["economyBusiness"];
    $p_id_list = $_GET["p_id"];
    $money = $_GET["money"];
    $insurance_type = $_GET["insurance_type"];

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
    <h2>Payment</h2>
    <div class="row content card">
        <div class="order_detail">
            <h4>Payment info:</h4>
            <div class="payment_detail">
                <span>Pay type:</span>
                <select id="pay_type" name="pay_type">
                    <option value="alipay">alipay</option>
                    <option value="paypal">paypal</option>
                    <option value="visa">visa</option>
                    <option value="mastercard">mastercard</option>
                    <option value="debit">debit</option>
                </select>
            </div>
            <div class="payment_detail">
                <span>Card number:</span>
                <input type="text" name="card_num" id="pay_number">
            </div>
            <div class="payment_detail">
                <span>Expiration date: </span>
                <input type="text" name="card_month">/
                <input type="text" name="card_year">
            </div>
            <div class="payment_detail">
                <span>Security code: </span>
                <input type="text" name="security_code">
            </div>
            <hr>
            <h4>billing details:</h4>
            <div class="payment_detail">
                <span>Full name: </span>
                <input type="text" name="full_name">
            </div>
            <div class="payment_detail">
                <span>Email address: </span>
                <input type="text" name="bill_email">
            </div>
            <div>
                <hr>
            <table id="pay_table">
                <tr>
                    <th style="width:100%; font-size: 25px">Total:</th>
                    <th id="total_price" style="width:100%; font-size: 25px">$<?php echo $money; ?></th>
                </tr>
                <tr>
                    <td>
                    <button class="btn cancel_order_btn" style="width:200px; background-color: red;" onMouseOver="this.style.color='white'" type="button" id="cancel_button">Cancel</button>
                    </td>
                    <td>
                    <button class="btn submit_payment_btn" style="width:200px" type="button" id="submit_button">Submit</button>
                    </td>
                </tr>
            </table>
            </div>
        </div>
    </div>
</div>

<div id='payment_modal' class="modal">
    <div clas="close_icon">
    <p class="close" title="Close Modal">&times;</p>
    </div>

    <form class="modal-content" action="/action_page.php">
        <div class="container popup_container" style="text-align:center">
            <h3 style='color:red'>Notice</h3>
            <hr>
            <h6>You must fill out 'Pay type' and 'Card number'!</h6>
            <hr>
            <div class="">
                <button type="button" class="popup_btn" onclick="closeNotification()">OK</button>
                <!-- <button type="submit" class="popup_btn loginbtn">OK</button> -->
            </div>
        </div>
    </form>

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

<script type="text/javascript">
    $(document).ready(function(){
        $("#cancel_button").click(function(){
            window.location.href = "index.php";
        });
        $("#submit_button").click(function(){
            var url = "payment_submit.php?";
            var p_id = "<?php echo $p_id_list; ?>";
            var oneRound = "<?php echo $oneRound; ?>";
            var economyBusiness = "<?php echo $economyBusiness; ?>";
            var departFlight_id = "<?php echo $departFlight_id; ?>";
            var departDate = "<?php echo $departDate; ?>";
            var money = "<?php echo $money; ?>";
            var insurance_type = "<?php echo $insurance_type; ?>";
            var pay_type = "";
            var pay_number = "";
            pay_type += $("#pay_type").val();
            pay_number += $("#pay_number").val();
            if(pay_type == "" || pay_number == "") {
                $('#payment_modal').addClass('show');
                // $("#pay_table").append("<h2 style='color:red'>You must fill out 'Pay type' and 'Card number'!</h2>")
            } else {
                if(oneRound == "one") {
                    url = url + "p_id=" + p_id + "&oneRound=" + oneRound + "&economyBusiness=" + economyBusiness + "&departFlight_id=" + departFlight_id + "&departDate=" + departDate + "&money=" + money + "&insurance_type=" + insurance_type + "&pay_type=" + pay_type + "&pay_number=" + pay_number;
                } else {
                    var returnFlight_id = "<?php echo $returnFlight_id; ?>";
                    var returnDate = "<?php echo $returnDate; ?>";
                    url = url + "p_id=" + p_id + "&oneRound=" + oneRound + "&economyBusiness=" + economyBusiness + "&departFlight_id=" + departFlight_id + "&departDate=" + departDate + "&returnFlight_id=" + returnFlight_id + "&returnDate=" + returnDate + "&money=" + money + "&insurance_type=" + insurance_type + "&pay_type=" + pay_type + "&pay_number=" + pay_number;
                }
                window.location.href = url;
            }
        });
    });

    function closeNotification() {
        $('#payment_modal').removeClass('show');
    }
</script>

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