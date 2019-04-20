<?php
session_start();
$name = $_SESSION["account_username"];
//$usr_type = $_SESSION['user_type'];
?>
<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="renderer" content="webkit">
    <meta http-equiv="Cache-Control" content="no-siteapp" />
    <title>QUZER Management</title>

    <link rel="shortcut icon" href="favicon.ico" tppabs="http://www.zi-han.net/theme/hplus/favicon.ico">
    <link href="css/bootstrap.min.css-v=3.3.5.css" tppabs="http://www.zi-han.net/theme/hplus/css/bootstrap.min.css?v=3.3.5" rel="stylesheet">
    <link href="css/font-awesome.min.css-v=4.4.0.css" tppabs="http://www.zi-han.net/theme/hplus/css/font-awesome.min.css?v=4.4.0" rel="stylesheet">
    <link href="css/animate.min.css" tppabs="http://www.zi-han.net/theme/hplus/css/animate.min.css" rel="stylesheet">
    <link href="css/style.min.css-v=4.0.0.css" tppabs="http://www.zi-han.net/theme/hplus/css/style.min.css?v=4.0.0" rel="stylesheet">
</head>

<body class="fixed-sidebar full-height-layout gray-bg" style="overflow:hidden">
    <div id="wrapper">

        <nav class="navbar-default navbar-static-side" role="navigation">
            <div class="nav-close"><i class="fa fa-times-circle"></i>
            </div>
            <div class="sidebar-collapse">
                <ul class="nav" id="side-menu">
                    <li class="nav-header">
                        <div class="dropdown profile-element">
                            <a data-toggle="dropdown" class="dropdown-toggle" href="#">
                                <span class="clear">
                               <span class="block m-t-xs"><strong class="font-bold"><?php echo $_SESSION['account_username']?></strong></span>
                                <span class="text-muted text-xs block">Admin</span>
                                </span>
                            </a>
                        </div>
                        <div class="logo-element">Quzher
                        </div>
                    </li>
                    <li>
                        <a href="#">
                            <i class="fa fa-home"></i>
                            <span class="nav-label">User management</span>
                            <span class="fa arrow"></span>
                        </a>
                        <ul class="nav nav-second-level">
                            <li>
                                <a class="J_menuItem" href="user_list.html" data-index="0">User List</a>
                            </li>
                            <li>
                                <a class="J_menuItem" href="user_add.html">Add user</a>
                            </li>
                            <li>
                                <a class="J_menuItem" href="user_list_deleted.html">Deleted user</a>
                            </li>
                        </ul>
                    </li>

                    <li>
                    <li>
                        <a href="#">
                            <i class="fa fa-home"></i>
                            <span class="nav-label">Flight management</span>
                            <span class="fa arrow"></span>
                        </a>
                        <ul class="nav nav-second-level">
                            <li>
                                <a class="J_menuItem" href="flight_list.html" data-index="0">Flight List</a>
                            </li>
                            <li>
                                <a class="J_menuItem" href="flight_add.html">Add flight</a>
                            </li>
                            <li>
                                <a class="J_menuItem" href="flight_list_deleted.html">Deleted flight list</a>
                            </li>
                        </ul>
                    </li>

                    <li>
                        <a href="#">
                            <i class="fa fa-home"></i>
                            <span class="nav-label">Order management</span>
                            <span class="fa arrow"></span>
                        </a>
                        <ul class="nav nav-second-level">
                            <li>
                                <a class="J_menuItem" href="order_list.php" data-index="0">Order List</a>
                            </li>
                        </ul>
                    </li>

                </ul>
            </div>
        </nav>

        <div id="page-wrapper" class="gray-bg dashbard-1">
            <div class="row content-tabs">
                <button class="roll-nav roll-left J_tabExit"><a href="../index.php"><i class="fa fa-backward"></i></a>
                </button>
                <nav class="page-tabs J_menuTabs">
                    <div class="page-tabs-content">
                        <a href="javascript:location.href='admin_index.php';" class="active J_menuTab" data-id="index_v1.html">Homepage</a>
                    </div>
                </nav>
                <a href="../logout.php" class="roll-nav roll-right J_tabExit"><i class="fa fa fa-sign-out"></i> Logout</a>
            </div>
            <div class="row J_mainContent" id="content-main">
                <iframe class="J_iframe" name="iframe0" width="100%" height="100%" frameborder="0" src="welcome.html" data-id="index_v1.html" seamless></iframe>
            </div>

        </div>

    </div>
    <script src="js/jquery.min.js-v=2.1.4.js" tppabs="http://www.zi-han.net/theme/hplus/js/jquery.min.js?v=2.1.4"></script>
    <script src="js/bootstrap.min.js-v=3.3.5.js" tppabs="http://www.zi-han.net/theme/hplus/js/bootstrap.min.js?v=3.3.5"></script>
    <script src="js/plugins/metisMenu/jquery.metisMenu.js" tppabs="http://www.zi-han.net/theme/hplus/js/plugins/metisMenu/jquery.metisMenu.js"></script>
    <script src="js/plugins/slimscroll/jquery.slimscroll.min.js" tppabs="http://www.zi-han.net/theme/hplus/js/plugins/slimscroll/jquery.slimscroll.min.js"></script>
    <script src="js/plugins/layer/layer.min.js" tppabs="http://www.zi-han.net/theme/hplus/js/plugins/layer/layer.min.js"></script>
    <script src="js/hplus.min.js-v=4.0.0.js" tppabs="http://www.zi-han.net/theme/hplus/js/hplus.min.js?v=4.0.0"></script>
    <script type="text/javascript" src="js/contabs.min.js" tppabs="http://www.zi-han.net/theme/hplus/js/contabs.min.js"></script>
    <script src="js/plugins/pace/pace.min.js" tppabs="http://www.zi-han.net/theme/hplus/js/plugins/pace/pace.min.js"></script>
</body>

</html>