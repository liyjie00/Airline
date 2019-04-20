$(document).ready(function(){
    $('input[type=checkbox]').change(function(){
        var isCheck = $(this).prop("checked");
        var p_id = $(this).prop("id");
        if (isCheck) {
            console.log(p_id);
            search(p_id);            
        } else {
            $("#" + p_id + "_info").remove();
        }
    });

    $('.add_pass').click(function(){
        $('#add_pass_modal').addClass('show');
    });

    $('#close_add').click(function(){
        $('#add_pass_modal').removeClass('show');
    });
    $('#cancel_add').click(function(){
        $('#add_pass_modal').removeClass('show');
    });
    $('.add_new_pass_btn').click(function(){
        var info = $("#add_info");
        var is_adult = info.find("#add_is_adult").val();
        var fname = info.find("#add_fname").val();
        var lname = info.find("#add_lname").val();
        var gender = info.find("input[name='add_gender']:checked").val();
        var nationality = info.find("#add_nationality").val();
        var id_type = info.find("#add_id_type").val();
        var id_number = info.find("#add_id_number").val();
        var phone = info.find("#add_phone").val();
        var dob = info.find("#add_dob").val();
        // console.log(is_adult);
        // console.log(fname);
        // console.log(lname);
        // console.log(gender);
        // console.log(nationality);
        // console.log(id_type);
        // console.log(id_number);
        // console.log(phone);
        // console.log(dob);
        $.ajax({
            url: "add_passenger_info.php",
            type: "GET",
            data: {"is_adult": is_adult, "fname": fname, "lname": lname, "gender": gender, "nationality": nationality, "id_type": id_type, "id_number": id_number, "phone": phone, "dob": dob},
            success: function(data){
                var passenger_info = $.parseJSON(data);
                var pname = passenger_info.lname + ", " + passenger_info.fname;
                $("#passenger_list").append("<label for='" + passenger_info.p_id + "'>" + pname + "<input type='checkbox' name='" + passenger_info.p_id + "'id='" + passenger_info.p_id + "'></label>");
                $("#" + passenger_info.p_id).change(function(){
                    var isCheck = $(this).prop("checked");
                    var p_id = $(this).prop("id");
                    // alert(aa);
                    if (isCheck) {
                        search(p_id);            
                    } else {
                        $("#" + p_id + "_info").remove();
                    }
                });
            },
            error: function(){
                alert("loading file unsuccessfully!");
            }
        });
        $('#add_pass_modal').removeClass('show');
    });
});

function update(p_id) {
    console.log(p_id);
    var info = $("#" + p_id + "_info");
    var is_adult = info.find("#" + p_id + "_isAdult").val();
    var fname = info.find(".fname").val();
    var lname = info.find(".lname").val();
    var gender = info.find("input[name='" + p_id + "_gender']:checked").val();
    var nationality = info.find(".nationality").val();
    var id_type = info.find(".id_type").val();
    var id_number = info.find(".id_number").val();
    var phone = info.find(".phone").val();
    var dob = info.find(".dob").val();
    $.ajax({
        url: "update_passenger_info.php",
        type: "GET",
        data: {"p_id": p_id, "is_adult": is_adult, "fname": fname, "lname": lname, "gender": gender, "nationality": nationality, "id_type": id_type, "id_number": id_number, "phone": phone, "dob": dob},
        success: function(){},
        error: function(){
            alert("loading file unsuccessfully!");
        }
    });
}

function search(p_id) {
    $.ajax({
        url: "get_passenger_info.php",
        type: "GET",
        data: {"p_id": p_id},
        success: function(data){
            var decode = $.parseJSON(data);
            var isMale = "checked";
            var isFemale = "";
            if(decode.gender == "F") {
                isMale = "";
                isFemale = "checked";
            }    
            $('#pass_info').append("<div class='row selected_pass' id='" + decode.p_id + "_info'><div class='col-sm-6'><div class='info_part'><span>Passenger type: </span><select id='" + decode.p_id + "_isAdult'><option value='1'>Adult</option><option value='0'>Child</option></select></div><div class='info_part'><span>First name: </span><input type='text' class='fname' value='" + decode.fname + "'></div><div class='info_part'><span>Last name: </span><input type='text' class='lname' value='" + decode.lname + "'></div><div class='info_part'><span>Gender:</span><input type='radio' name='" + decode.p_id + "_gender' value='M' " + isMale + "><label class='male' for='male'>Male  </label><input type='radio' name='" + decode.p_id + "_gender' value='F' " + isFemale + "><label for='female'>Female</label></div><div class='info_part'><span>Nationality: </span><input type='text' class='nationality' value='" + decode.nationality + "'></div></div><div class='col-sm-6'><div class='info_part'><span>Id type: </span><select class='id_type' id='" + decode.p_id + "_idType'><option value='ssn'>SSN</option><option value='passport'>Passport</option><option value='driverlicense'>Driver License</option></select></div><div class='info_part'><span>ID number: </span><input class='id_number' type='text' value='" + decode.id_number + "'></div><div class='info_part'><span>Phone number: </span><input type='text' class='phone' value='" + decode.phone + "'></div><div class='info_part'><span>Date of birth: </span><input type='date' class='dob' value='" + decode.dob + "'></div><button type='button' id='" + decode.p_id + "_button' class='btn update_info' style='width:30%; height: 30px; float:left;margin:5px;'>Update info</button><button type='button' id='" + decode.p_id + "_delete_btn' class='btn delete_btn' style='width:30%; height: 30px'>Delete Passenger</button></div><hr></div>");
            $("#" + decode.p_id + "_button").click(function() {
                var p_id = $(this).prop("id");
                p_id = p_id.substring(0, p_id.length - 7);
                update(p_id);
            });
            $("#" + decode.p_id + "_delete_btn").click(function() {
                var p_id = $(this).prop("id");
                p_id = p_id.substring(0, p_id.length - 11);
                delete_passenger(p_id);
            });
            var isAdult = decode.is_adult;
            $("#" + decode.p_id + "_isAdult").find("option[value='" + isAdult + "']").attr("selected",true);
            var idType = decode.id_type;
            $("#" + decode.p_id + "_idType").find("option[value='" + idType + "']").attr("selected",true);
        },
        error: function(){
            alert("loading file unsuccessfully!");
        }
    });
}

function delete_passenger(p_id) {
    console.log(p_id);
    $.ajax({
        url: "delete_passenger_info.php",
        type: "GET",
        data: {"p_id": p_id},
        success: function(data){
            $('#' + p_id + "_label").remove();
            $("#" + p_id + "_info").remove();
        },
        error: function(){
            alert("loading file unsuccessfully!");
        }
    });
}