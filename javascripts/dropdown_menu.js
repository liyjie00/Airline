$(document).ready(function(){
    $(".seat_options").click(function(){
        $("#seat_text").html($(this).text());
    })

    // $(".trip_options").click(function(){
    //     $("#trip_text").html($(this).text());
    //     if ($("#trip_text").text() == "One-way "){
    //         $("#trip_text").attr("value", 1);
    //     } else {
    //         $("#trip_text").attr("value", 2);
    //     }
    //     var trip_type = $("#trip_text").attr("value");
    //     if (trip_type == 2) {
    //         $("#return").html("<input id='return_date' type='date' style='float:left'>");
    //     } else{
    //         $("#return").html("");
    //     }
    // })
    $("#one-round").change(function(){
        var option = $("#one-round").val();
        if(option == "round") {
            $("#return").html("<input id='return_date' name='return_date' type='date' style='float:left'>");
        } else {
            $("#return").html("");
        }
    })
    $("#s_one-round").change(function(){
        console.log($("#s_one-round").val());
        var option = $("#s_one-round").val();
        if(option == "round") {
            $("#s_return").html("<input id='s_return_date' name='return_date' type='date' style='float:left'>");
        } else {
            $("#s_return").html("");
        }
    })
});