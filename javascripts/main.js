$(document).ready(function(){
    // airport autocomplete
    var $_searchQuery = $('.search_query');

    // test data (to be retrieved from database)
    var data = ["Dallas", "New York", "Beijing", "Guangzhou", "Tokyo", "Paris", "London"];

    $.ui.autocomplete.prototype._renderItem = function (ul, item) {
        var re = new RegExp($.trim(this.term.toLowerCase()));
        console.log(this);
        var t = item.label.replace(re, "<span style='font-weight:600;color:black;'>" + $.trim(this.term.toLowerCase()) +
            "</span>");
        return $("<li></li>")
            .data("item.autocomplete", item)
            .append("<a>" + t + "</a>")
            .appendTo(ul);
    };
    $_searchQuery.autocomplete({
        source: data
    });

    // switch the origin and the destination  
    $("#change_place").click(function(){
        var temp = $("#from").val();
        $("#from").val($("#to").val());
        $("#to").val(temp);
        // event.preventDefault();
    });

});