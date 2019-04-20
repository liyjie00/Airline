<script type="text/javascript">
    $(document).ready(function() {
        $('#edit').on("click", function() { 
            var old_password = $("#old_password").val();
            var new_password = $("#new_password").val();
            var confirm_password = $("#confirm_password").val();

            var password_preg = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[\s\S]{8,16}$/;
            if (!password_preg.test(new_password)) {
                $('#new_password').focus();
                $('#error').html("Use at least one lowercase letter, one uppercase letter, one numeral, and eight characters");
                return;
            }
            if (new_password != confirm_password) {
                 $('#confirm_password').focus();
                 $('#error').html("The two passwords are not the same");
                 return;
            }

            $.ajax({
                type : 'post',
                url : 'password_edit.php',
                headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
                data : {
                    old_password : old_password,
                    new_password : new_password
                },
                success: function(response) {
                    if (response == 0) {
                      $('#error').html("");
                      alert("Success");
                      location.reload();
                    } else if(response == 1) {
                      $('#error').html("Server error");
                    } else if(response == 2) {
                      $('#old_password').focus();
                      $('#error').html("The old password is error");
                    }
                },
                error: function() {
                }
            });
        })
    });    
</script>

<div id="main" class="container" style="margin-left:210px">
    <hr>
    <div class="row">
        <div class="ibox-content">
              <form id="password_form" method="post" class="form-horizontal m-t" >
                  <div class="col-sm-offset-3" id = "error" style="color:red"></div>
                  <div class="form-group">
                      <label class="col-sm-3 control-label">Old password:</label>
                      <div class="col-sm-6">
                          <input id="old_password" class="form-control" type="password">
                      </div>
                  </div>
                  <div class="form-group">
                      <label class="col-sm-3 control-label">New password:</label>
                      <div class="col-sm-6">
                          <input id="new_password" class="form-control" type="password">
                      </div>
                  </div>
                  <div class="form-group">
                      <label class="col-sm-3 control-label">Confirm password:</label>
                      <div class="col-sm-6">
                          <input id="confirm_password" class="form-control" type="password">
                      </div>
                  </div>
                  <div class="form-group">
                      <div class="col-sm-6 col-sm-offset-3">
                          <button class="btn btn-primary js-login-btn" type="button" id="edit">Edit</button>
                      </div>
                  </div>
              </form>
          </div>
    </div>
</div>

