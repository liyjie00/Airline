<?php
session_start();
?>

<div id="add_pass_modal" class="modal">
    <div clas="close_icon">
    <p id="close_add" class="close" title="Close Modal">&times;</p>
    </div>

    <div class="modal-content">
        <div id="add_info" class="container popup_container">
            <h1>New Passenger</h1>
            <p>Please fill in this form to add an new passenger.</p>
            <hr>
            <div class='col-sm-6'>
                <div class='info_part'>
                    <span>Passenger type: </span>
                    <select id='add_is_adult'>
                        <option value='1'>Adult</option>
                        <option value='0'>Child</option>
                    </select>
                </div>
                <div class='info_part'>
                    <span>First name: </span>
                    <input type='text' id='add_fname'>
                </div>
                <div class='info_part'>
                    <span>Last name: </span>
                    <input type='text' id='add_lname'>
                </div>
                <div class='info_part'>
                    <span>Gender: </span>
                    <input type='radio' value='M' name='add_gender'>
                    <label class='male' for='male'>Male  </label>
                    <input type='radio' value='F' name='add_gender'>
                    <label for='female'>Female</label>
                </div>
                <div class='info_part'>
                    <span>Nationality: </span>
                    <input type='text' id='add_nationality'>
                </div>
            </div>
            <div class='col-sm-6'>
                <div class='info_part'>
                <span>Id type: </span>
                <select id='add_id_type'>
                    <option value='ssn'>SSN</option>
                    <option value='passport'>Passport</option>
                    <option value='driverlicense'>Driver License</option>
                </select>
                </div>
                <div class='info_part'>
                    <span>ID number: </span>
                    <input type='text' id='add_id_number'>
                </div>
                <div class='info_part'>
                    <span>Phone number: </span>
                    <input type='text' id='add_phone'>
                </div>
                <div class='info_part'>
                    <span>Date of birth: </span>
                    <input type='date' id='add_dob'>
                </div>
<!--            </div>-->

<!--            <div class="">-->
                <button type="submit" class="popup_btn add_new_pass_btn" style='width: 50%;float:left'>Add</button>
                <button type="button" id="cancel_add" class="popup_btn cancelbtn" style=' background-color: red;' onMouseOver="this.style.color='white'">Cancel</button>
            </div>
        </div>
    </div>
</div>