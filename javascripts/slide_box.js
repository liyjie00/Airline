$(document).ready(function () {
    var q_block = $("#query_block");
    var r_block = $("#recommend_block");
    var s_block = $("#signup_block");
    var l_block = $("#login_block");

    $("#signup_btn").click(function () {
        if (l_block.hasClass("show")) {
            l_block.removeClass("show");
            l_block.animate({left: "125%"}, 50);
        }
        box_slide();
        s_block.addClass("show");
        s_block.animate({left: "90%"}, 400);
        s_block.animate({left: "95%"}, 400);
    });

    $("#login_btn").click(function () {
        if (s_block.hasClass("show")) {
            s_block.removeClass("show");
            s_block.animate({left: "125%"}, 50);
        }
        box_slide();
        l_block.addClass("show");
        l_block.animate({left: "90%"}, 400);
        l_block.animate({left: "95%"}, 400);
    });

    $('#go2signup').click(function () {
        l_block.removeClass("show");
        l_block.animate({left: "125%"}, 50);
        box_slide();
        s_block.addClass("show");
        s_block.animate({left: "90%"}, 400);
        s_block.animate({left: "95%"}, 400);
    });

    $('#go2login').click(function () {
        s_block.removeClass("show");
        s_block.animate({left: "125%"}, 50);
        box_slide();
        l_block.addClass("show");
        l_block.animate({left: "90%"}, 400);
        l_block.animate({left: "95%"}, 400);
    });

    var box_slide = function () {
        q_block.animate({width: "60%", left: "5%"}, 400);
        q_block.animate({left: "10%"}, 400);

        r_block.animate({width: "60%", left: "5%"}, 400);
        r_block.animate({left: "10%"}, 400);
    };
});