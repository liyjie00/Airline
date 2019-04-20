function revocerFlight(id) {
	alert("Do you want to recover?");
	$.ajax({
		type : 'post',
		url : 'flight_recover.php',
		headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
		data :{
			id : id
		},
		contentType: "application/json; charset=utf-8",
		dataType : 'json',
		
		success: function(response) {
			if (response == 0) {
				alert("Revocer success");
			}
			
			getFlightList();
		},
		error: function() {
		}
	});
}

function getFlightList() {
	var keywords = $('#keywords').val();
	$.ajax({
		type : 'get',
		url : 'flight_list.php',
		data :{
			keywords : keywords,
			deleted : '1'
		},
		contentType: "application/json; charset=utf-8",
		dataType : 'json',
		
		success: function(response) {
			$("#flight_list").empty();
			for(var i = 0; i < response.length; i++){
                $("#flight_list").append("<tr><td>" + i + "</td>" +
                	"<td>" + response[i].depart_code + "</td>" +
                    "<td>" + response[i].arrive_code + "</td>" +
                    "<td>" + response[i].date + " " +response[i].depart_time +"</td>" +
                    "<td>" + response[i].num_bus_seat + "</td>" +
                    "<td>" + response[i].num_econ_seat + "</td>" +
                    "<td>" + response[i].discount_rate + "</td>" +
                    "<td><button type= \"button\", onclick=\"revocerFlight('"+response[i].flight_id +"')\">Recover</button></td></tr>");
            }
		},
		error: function() {
		}
	});
}

$(document).ready(function() {
	getFlightList();
	$('#search').on("click", function() { 
		getFlightList();
	})
});