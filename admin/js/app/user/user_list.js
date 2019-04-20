function edit(id,username,email,user_type) {
	window.location='user_edit.html?id=' + id+"&username="+username+"&email="+email+"&user_type="+user_type;
}

function deleteUser(id) {
	$.ajax({
		type : 'post',
		url : 'user_delete.php',
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
			deleted : '0'
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
                    "<td><button type= \"button\", onclick=\"deleteUser('"+response[i].account_id +"')\">Delete</button>" +
                            "<button type= \"button\", onclick=\"edit('"+id +"','"+username +"','"+email +"','"+user_type +"')\">Edit</button></td></tr>")
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