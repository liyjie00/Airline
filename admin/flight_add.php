<?php
    session_start();
    $airplane = $_POST["airplane"];
    $departure = $_POST["departure"];
    $arrival = $_POST["arrival"];
    $date = $_POST["date"];
    $econ_seat = $_POST["econ_seat"];
    $bus_seat = $_POST["bus_seat"];
    $discount_rate = $_POST["discount_rate"];
    $departure_time = $_POST["departure_time"];
    $arrival_time = $_POST["arrival_time"];
    $econ_price = $_POST["econ_price"];
    $bus_price = $_POST["bus_price"];

    $fileName = $_FILES['file']['name'];
    $fileType = $_FILES['file']['type'];

    $fileContent = file_get_contents($_FILES['file']['tmp_name']);
    move_uploaded_file($_FILES["file"]["tmp_name"],"../img/" . $fileName);
    
    $user = 'root';
    $password_mql = 'WQjb1234!';
    $db = 'test';
    $host = '149.28.213.37';
    $port = 3306;

    $conn = mysqli_connect(
       $host, 
       $user, 
       $password_mql, 
       $db
    );


    if (!$conn){
        echo "1";
        exit();
    }

    $sql = "SELECT * FROM flight_leg where depart_code = '$departure' and arrive_code = '$arrival' and airplane_code=$airplane";
   
    $result = mysqli_query($conn, $sql);

    if ($result->num_rows === 0) {
        $sql = "insert into flight_leg(depart_code,arrive_code,depart_time,arrive_time,airplane_code) values 
        ('$departure','$arrival','$departure_time','$arrival_time',$airplane)";
        $result = mysqli_query($conn, $sql);
        $flight_id = mysqli_insert_id($conn);

        //insert into fare
        $sql = "insert into fare values('$flight_id','business','$bus_price')";
        $result = mysqli_query($conn, $sql);

        //insert into fare
        $sql = "insert into fare values('$flight_id','economy','$econ_price')";
        $result = mysqli_query($conn, $sql);
    } else {
        $r = mysqli_fetch_assoc($result);
        $flight_id = $r["flight_id"];
    }

    //insert into flight
    $sql = "insert into flight values('$flight_id','$date','$econ_seat','$bus_seat',$airplane,'$discount_rate',0)";
    $result = mysqli_query($conn, $sql);

    $sql = "insert into icon(filename) values ('$fileName')";

    $result = mysqli_query($conn, $sql);
    $icon_id = mysqli_insert_id($conn);

    $sql = "insert into fligth_icon(flight_id,icon_id) values ($flight_id,$icon_id)";


    $result = mysqli_query($conn, $sql);

    echo "0";
?>