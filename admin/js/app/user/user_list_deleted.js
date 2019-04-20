function recoverUser(id) {
	$.ajax({
		type : 'post',
		url : 'user_recover.php',
		headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
		data :{
			id : id
		},
		contentType: "application/json; charset=utf-8",
		dataType : 'json',
		
		success: function(response) {
			if (response == 0) {
				alert("Recover success");
			}
			
			getUserList();
		},
		error: function() {
		}
	});
}

function getUserList() {
	var keywords = $('#keywords').val();
	$.ajax({
		type : 'get',
		url : 'user_list.php',
		data :{
			keywords : keywords,
			deleted : '1'
		},
		contentType: "application/json; charset=utf-8",
		dataType : 'json',
		
		success: function(response) {
			$("#user_list").empty();
			for(var i = 0; i < response.length; i++){
				var id = response[i].account_id;
				var username = response[i].username;
				var email = response[i].email;
				var user_type = response[i].user_type;
                $("#user_list").append("<tr><td>" + i + "</td>" +
                	"<td>" + response[i].username + "</td>" +
                    "<td>" + response[i].email + "</td>" +
                    "<td>" + response[i].user_type + "</td>" +
                    "<td><button type= \"button\", onclick=\"recoverUser('"+response[i].account_id +"')\">Recover</button></td></tr>")
            }
		},
		error: function() {
		}
	});
}

$(document).ready(function() {
	getUserList();
	$('#search').on("click", function() { 
		getUserList();
	})
});