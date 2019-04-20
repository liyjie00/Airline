<?php
?>
<div class="query_box">
    <div class="bg_body"></div>
</div>
<div id="query_form">
    <div class="col-lg-2" style="border-right: 2px solid white; text-align: right">
        <h3>Flights</h3>
        <p style="color:white; font-size:50px;"><span class="glyphicon glyphicon-plane"></span></p>
    </div>
    <div class="col-lg-10">
        <form id="query_info" action="search.php" method="post">
            <div class="input_row">

                <select id="one-round" name="one-round">
                    <option value="one">One-way</option>
                    <option value="round">Round-way</option>
                </select>
                <select name="economy-business">
                    <option value="economy">Economy</option>
                    <option value="business">Business</option>
                </select>
                <br>
                <div class="input_row">
                    <input class="search_query" style="float: left" type="text" id="from" name="from" placeholder="From">
                    <img id="change_place" src="img/arrow-change-white.png" alt="arrow">
                    <input class="search_query" type="text" id="to" name="to" placeholder="To"><br>
                </div>
                <div class="input_row">
                    <input style="float: left" id="depart_date" name="depart_date" type="date">
                    <div id="return"></div>
                    <button id="search_btn" class="btn" style="font-size: 120%"><span class="glyphicon glyphicon-search"></span> Search</button>
                </div>
                <div>
                    <?php
                        if(isset($_SESSION["check"])) {
                            if($_SESSION["check"] == False) {
                                echo "<h2 style='color:red'>Please fill out complete information!</h2>";
                            }
                            unset($_SESSION['check']);
                        }
                        if(isset($_SESSION["find"])) {
                            if($_SESSION["find"] == False) {
                                echo "<h2 style='color:red'>Sorry, do not find any valid record!</h2>";
                            }
                            unset($_SESSION['find']);
                        }
                    ?>
                </div>
            </div>
        </form>
    </div>
</div>