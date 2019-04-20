function GetRequest() {   
   var url = location.search;
   var theRequest = new Object();   
   if (url.indexOf("?") != -1) {   
      var str = url.substr(1);   
      strs = str.split("&");   
      for(var i = 0; i < strs.length; i ++) {   
         theRequest[strs[i].split("=")[0]]=unescape(strs[i].split("=")[1]);   
      }   
   }   
   return theRequest;   
}
var id;
$(document).ready(function() {
	var request = GetRequest();
	$("#flight_id").val(request.id);
 	$("#flight_id").attr("readonly","readonly");

 	$("#departure").val(request.departure);
 	$("#departure").attr("readonly","readonly");

 	$("#arrival").val(request.arrival);
 	$("#arrival").attr("readonly","readonly");

 	$("#date").val(request.date);
 	$("#date").attr("readonly","readonly");

 	$("#econ_seat").val(request.econ_seat);

 	$("#bus_seat").val(request.bus_seat);

 	$("#discount_rate").val(request.discount_rate);

 	id = request.id;
 	$('#edit').on("click", function() { 
		var data = $('#fligt_edit_form').serialize();
		$.ajax({
			type : 'post',
			url : 'flight_edit.php',
			headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
			data : data,
			contentType: "application/json; charset=utf-8",
			dataType : 'json',
			
			success: function(response) {
				if (response == '0') {
					alert("edit success");
					window.location='flight_list.html';
				} else if (response == 1) {
                    $('#error').html("Server error");
				}
				
			},
			error: function() {
			}
		});
	})

});