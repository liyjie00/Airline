$(document).ready(function() {
 	$('#add').on("click", function() { 
		var formData = new FormData();
		formData.append('file', $('#file')[0].files[0]);
		formData.append('airplane', $("#airplane").val());
		formData.append('departure', $("#departure").val());
		formData.append('arrival', $("#arrival").val());
		formData.append('date', $("#date").val());
		formData.append('econ_seat', $("#econ_seat").val());
		formData.append('bus_seat', $("#bus_seat").val());
		formData.append('discount_rate', $("#discount_rate").val());
		formData.append('departure_time', $("#departure_time").val());
		formData.append('arrival_time', $("#arrival_time").val());
		formData.append('bus_price', $("#bus_price").val());
		formData.append('econ_price', $("#econ_price").val());
		$.ajax({
			type : 'post',
			url : 'flight_add.php',
			data : formData,
			enctype: 'multipart/form-data',
			processData: false,  // tell jQuery not to process the data
	       	contentType: false,  // tell jQuery not to set contentType
	       	success : function(data) {
	           	alert("success");
	       	}
		});
	})

});