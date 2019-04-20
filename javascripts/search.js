$(document).ready(function(){
    // switch the origin and the destination Â 
    $("#s_change_place").click(function(){
        var temp = $("#s_from").val();
        $("#s_from").val($("#s_to").val());
        $("#s_to").val(temp);
        // event.preventDefault();
    });

    // $('.add_favor').click(function(){
    //
    // });



    // $(".s_trip_options").click(function(){
    //     $("#s_trip_text").html($(this).text());
    //     if ($("#s_trip_text").text() == "One-way "){
    //         $("#s_trip_text").attr("value", 1);
    //     } else {
    //         $("#s_trip_text").attr("value", 2);
    //     }
    //     var trip_type = $("#s_trip_text").attr("value");
    //     if (trip_type == 2) {
    //         $("#s_return").html("<input id='return_date' type='date'>");
    //     } else{
    //         $("#s_return").html("");
    //     }
    // })

    // $(".s_seat_options").click(function(){
    //     $("#s_seat_text").html($(this).text());
    // })

    // $("body").on("click",function(e){         
    //     alert(e.target);
        
    // });
});

function addfavor1(depart_id, departDate, oneRound, pass_type) {
    console.log(depart_id);
    console.log(departDate);
    console.log(oneRound);
    $.ajax({
        url: "add_favorite.php",
        type: "GET",
        data: {"depart_id": depart_id, "departDate": departDate, "oneRound": oneRound, "pass_type": pass_type},
        success: function(data){
        },
        error: function(){
            alert("loading file unsuccessfully!");
        }
    });
}

function addfavor2(depart_id, departDate, return_id, returnDate, oneRound) {
    console.log(depart_id);
    console.log(departDate);
    console.log(return_id);
    console.log(returnDate);
    console.log(oneRound);
    $.ajax({
        url: "add_favorite.php",
        type: "GET",
        data: {"depart_id": depart_id, "departDate": departDate, "return_id": return_id, "returnDate": returnDate, "oneRound": oneRound, "pass_type": pass_type},
        success: function(data){
        },
        error: function(){
            alert("loading file unsuccessfully!");
        }
    });
}