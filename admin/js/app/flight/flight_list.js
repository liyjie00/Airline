function edit(id,departure,arrival,date, econ_seat, bus_seat, discount_rate) {
	window.location='flight_edit.html?id=' + id+"&departure="+departure+"&arrival="+arrival+"&date="+date+"&econ_seat="+econ_seat+"&bus_seat="+bus_seat+"&discount_rate="+discount_rate;
}

function deleteFlight(id) {
	alert("Do you want to delete?");
	$.ajax({
		type : 'post',
		url : 'flight_delete.php',
		headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
		data :{
			id : id
		},
		contentType: "application/json; charset=utf-8",
		dataType : 'json',
		
		success: function(response) {
			if (response == 0) {
				alert("Delete success");
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
			deleted : '0'
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
                    "<td><button type= \"button\", onclick=\"deleteFlight('"+response[i].flight_id +"')\">Delete</button>" +
                            "<button type= \"button\", onclick=\"edit('"+
                            response[i].flight_id +"','"+ response[i].depart_code +"','"+response[i].arrive_code +"','"+response[i].date +"','"+response[i].num_econ_seat +"','"+response[i].num_bus_seat +"','"+response[i].discount_rate+
                            "')\">Edit</button></td></tr>");
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