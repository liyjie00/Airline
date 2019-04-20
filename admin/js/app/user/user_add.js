$(document).ready(function() {
 	$('#add').on("click", function() { 
		var username = $("#username").val();
		var password = $("#password").val();
		var email = $("#email").val();
		var user_type = $("#user_type").val();

		var username_preg = /^[a-zA-Z0-9]*$/;
		if (username == "") {
			$('#username').focus();
            $('#error').html("Please input username");
            return;
		}
		if (!username_preg.test(username)) {
			$('#username').focus();
            $('#error').html("Use letters and numbers");
		}

		var email_preg = /^(\w{1,25})@(\w{1,16})(\.(\w{1,4})){1,3}$/;
		if (!email_preg.test(email)) {
			$('#email').focus();
            $('#error').html("Please input valid email");
            return;
		}

		var password_preg = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[\s\S]{8,16}$/;
		if (password == "") {
			$('#password').focus();
            $('#error').html("Please input password");
            return;
		}
		if (!password_preg.test(password)) {
			$('#password').focus();
            $('#error').html("Use at least one lowercase letter, one uppercase letter, one numeral, and eight characters");
            return;
		}
		
		if (user_type != 0 && user_type != 1) {
			$('#user_type').focus();
            $('#error').html("User type 0:normal user, 1:admin user");
            return;
		}
		$.ajax({
			type : 'post',
			url : 'user_add.php',
			headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
			data :{
				signup_username : username,
				signup_pwd : password,
				user_type : user_type,
				signup_email : email
			},
			contentType: "application/json; charset=utf-8",
			dataType : 'json',
			
			success: function(response) {
				if (response == '0') {
					alert("add success");
					//window.location='user_list.html';
				} else if (response == 1) {
                    $('#error').html("Serve error");
				} else if (response == 2) {
					$('#username').focus();
                    $('#error').html("The username has been used");
				} else if (response == 3) {
					$('#email').focus();
                    $('#error').html("The email has been used");
				}
				
			},
			error: function() {
			}
		});
	})

});