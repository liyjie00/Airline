<?php
//$user = 'root';
//$password = 'WQjb1234!';
//$db = 'test';
//$host = '149.28.213.37';
//$port = 3306;
//$conn = mysqli_connect($host, $user, $password, $db, $port);
//
//
//if (!$conn){
//    echo "Connection failed!";
//    exit();
//}
//
////$sql ="select fl.depart_code, fl.arrive_code from order_flight as of flight_leg as fl where of.flight_id = fl.flight_id;";
////$sql ="select * from account where account_id = 1";
//$sql ="select dcode, acode from (select flight_leg.depart_code as dcode, flight_leg.arrive_code as acode from order_flight, flight_leg where order_flight.flight_id = flight_leg.flight_id);";
//$result = mysqli_query($conn, $sql);
//echo count($result)."<br>";
//while($row = mysqli_fetch_array($result)){
//    echo json_encode($row)."<br>";
//}
//?>