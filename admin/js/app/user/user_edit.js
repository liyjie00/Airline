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
	$("#username").val(request.username);
 	$("#username").attr("readonly","readonly");
 	$("#email").val(request.email);
 	$("#user_type").val(request.user_type);

 	id = request.id;
 	$('#edit').on("click", function() { 
		var email = $("#email").val();
		var user_type = $("#user_type").val();
		if (user_type!='0' && user_type !="1") {
			alert("User type can only be 0 or 1");
			return;
		}
		$.ajax({
			type : 'post',
			url : 'user_edit.php',
			headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
			data :{
				id : id,
				email : email,
				user_type : user_type
			},
			contentType: "application/json; charset=utf-8",
			dataType : 'json',
			
			success: function(response) {
				if (response == '0') {
					alert("edit success");
					window.location='user_list.html';
				} else if (response == 2) {
					$('#email').focus();
                    $('#error').html("The email has been used by other users");
				}
				
			},
			error: function() {
			}
		});
	})

});