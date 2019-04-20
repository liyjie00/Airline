<?php
session_start();
?>
<script type="text/javascript">
    function getEmail() {
        $.ajax({
            type : 'get',
            url : 'email_get.php',
            contentType: "application/json; charset=utf-8",
            dataType : 'json',
            
            success: function(response) {
                $("#email").empty();
                $("#email").val(response.email);
            },
            error: function() {
            }
        });
    }

    function editEmail() {
        var email = $("#email").val();
        var email_preg = /^(\w{1,25})@(\w{1,16})(\.(\w{1,4})){1,3}$/;
        if (!email_preg.test(email)) {
          $('#email').focus();
          $('#email_error').html("Please input valid email");
          return false;
        }
        $.ajax({
            type : 'post',
            url : 'email_edit.php',
            headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
            data : {
                email : email
            },
            success: function(response) {
                return true;
            },
            error: function() {
            }
        });
    }

    $(document).ready(function() {
        getEmail();
        $('#email_edit').on("click", function() {
            if (editEmail() == false) {
              return;
            }
            getEmail();
            $('#email_error').html("");
            alert("Success");
            location.reload();
        });

    });

</script>

<div id="main" class="container" style="margin-left:210px">
    <hr>
    <div class="row">
        <div class="col-lg-5 col-lg-offset-3" id = "email_error" style="color:red"></div>
        <div class="col-lg-5 col-lg-offset-3">
            <label class="control-label" style="float: left">Email address:</label>

            <div class="input-group">
                <input type="text" id="email" class="input-lg form-control" style="font-size: 95%"> <span class="input-group-btn">
                    <button style="margin-left: 5px" type="button" id="email_edit" class="btn btn-lg btn-primary"> Edit</button> </span>
            </div>

        </div>
    </div>
</div>

