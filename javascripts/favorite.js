$(document).ready(function(){
    $('.delete_btn').click(function(){
    	var favorite_id = $(this).prop("id");
    	favorite_id = favorite_id.substring(0, favorite_id.length - 7);
        $.ajax({
        	url: "delete_favorite_info.php",
        	type: "GET",
        	data: {"favorite_id": favorite_id},
	        success: function(data){
	            $('#' + favorite_id + "_favorite").remove();
	        },
	        error: function(){
	            alert("loading file unsuccessfully!");
	        }
        });
    });
});