exports.sameDay = function(date1, todayDate) {
    // Time difference in days
    var timeDiff = (date1.getTime() - todayDate.getTime())/86400000;
    return timeDiff >= 0.0 && timeDiff <= 1.0;
}

exports.minutesBetween = function(date1, date2) {
    var timeDiff = (date1.getTime() - date2.getTime())/60000;
    return timeDiff;
}

exports.isTodayOrBefore = function(dateStr) {
    var d1 = new Date(dateStr);
    var d2 = new Date();
    return d1 <= d2 || module.exports.sameDay(d1, d2);
}

exports.buildYYYMMDDToday = function() {
    var today = new Date();

    var yyyy = today.getFullYear();
    var mm = today.getMonth() + 1;
    var dd = today.getDate();

    return yyyy+"-"+mm+"-"+dd;
}